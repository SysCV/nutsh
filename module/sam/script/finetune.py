import os
import json
import glob
import logging
import hashlib
from statistics import mean
from typing import List, Set, Any, Tuple, Optional
from enum import Enum
from urllib.parse import urlparse
from dataclasses import dataclass

import cv2
import torch
import requests
import numpy as np
from pycocotools import mask as coco_mask  # type: ignore
from tap import Tap
from torch.nn.functional import binary_cross_entropy

from segment_anything import SamPredictor, sam_model_registry  # type: ignore
from segment_anything.modeling import Sam  # type: ignore
from segment_anything.utils.transforms import ResizeLongestSide  # type: ignore
from segment_anything.utils.onnx import SamOnnxModel  # type: ignore
from segment_anything.utils.amg import calculate_stability_score  # type: ignore

from .quantize import save_quantized_onnx  # type: ignore


class ModelType(Enum):
    """Different SAM model types."""

    VIT_H = "vit_h"
    VIT_L = "vit_l"
    VIT_B = "vit_b"


class TrainArgument(Tap):
    num_epoch: int = 10  # Epoch to train.
    lr: float = 1e-4  # Learning rage.
    wd: float = 0  # Weight decay.


class Argument(TrainArgument):
    log_level: str = "INFO"  # Log level.
    sample_dir: str  # Path to the samples directory.
    workspace: str  # Path to a directory to store intermediate data.
    model_type: ModelType  # The SAM model type to use.
    checkpoint: str  # Path to the SAM model checkpoint.
    output: str  # Path to the quantized checkpoint.
    device: Optional[str] = None  # Device to run the model.


def image_save_path(args: Argument, url: str):
    # calculate the MD5 hash of the URL as filename
    md5_hash = hashlib.md5(url.encode("utf-8")).hexdigest()

    # parse the URL and extract the file extension, if available
    parsed_url = urlparse(url)
    _, ext = os.path.splitext(parsed_url.path)

    # check if file exists
    return os.path.join(args.workspace, "image", f"{md5_hash}{ext}")


def download_image(args: Argument, url: str):
    # check if file exists
    save_path = image_save_path(args, url)
    if os.path.exists(save_path):
        # skip downloading
        logging.info("skip downloading image %s", url)
        return

    logging.info("downloading image %s", url)
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    # download the image
    response = requests.get(url, timeout=15)
    response.raise_for_status()

    # save
    with open(save_path, "wb") as f:
        f.write(response.content)


@dataclass(kw_only=True)
class PointPrompt:
    x: float
    y: float
    type: int


@dataclass(kw_only=True)
class Record:
    embedding: torch.Tensor
    input_size: Tuple[int]
    image_size: Tuple[int]
    point_prompts: List[PointPrompt]
    mask: torch.Tensor


@dataclass(kw_only=True)
class Dataset:
    records: List[Record]
    transform: ResizeLongestSide


def prepare_dataset(args: Argument, sam: Sam, samples: List[Any]) -> Dataset:
    transform = ResizeLongestSide(sam.image_encoder.img_size)
    predictor = SamPredictor(sam)

    records: List[Record] = []
    for idx, sample in enumerate(samples):
        # image
        image_path = image_save_path(args, sample["imageUrl"])
        image = cv2.imread(image_path)

        # TOOD(hxu): find a more elegant way to deal with protocol buffers.
        try:
            crop = sample["segmentation"]["input"]["crop"]
            if crop is not None:
                x, y, w, h = crop["x"], crop["y"], crop["width"], crop["height"]
                image = image[y : y + h, x : x + w]
        except KeyError:
            pass

        logging.info("embedding sample %d/%d", idx + 1, len(samples))
        predictor.set_image(image)  # type: ignore
        embedding = predictor.get_image_embedding()

        image_size = image.shape[:2]
        input_size = predictor.input_size

        # point prompts
        point_prompts: List[PointPrompt] = []
        ps = sample["segmentation"]["prompt"]["pointPrompts"]
        for p in ps:
            point_prompts.append(
                PointPrompt(
                    x=p["x"],
                    y=p["y"],
                    type=1 if p["isPositive"] else 0,
                )
            )

        # mask
        mask_encoded = sample["segmentation"]["output"]["mask"]
        rle_str, mw, mh = mask_encoded["cocoEncodedRle"], mask_encoded["size"]["width"], mask_encoded["size"]["height"]
        mask_decoded = coco_mask.decode({"size": [mh, mw], "counts": rle_str})
        mask = torch.as_tensor(mask_decoded, dtype=torch.float32, device=args.device)[None, None, :, :]

        records.append(
            Record(
                embedding=embedding,
                image_size=image_size,
                input_size=input_size,
                point_prompts=point_prompts,
                mask=mask,
            )
        )

    return Dataset(transform=transform, records=records)


class SamOnnxModelTrainable(SamOnnxModel):
    # This function is straightly copied from the `forward` method of SamOnnxModel with only `@torch.no_grad()` removed.
    # As this model is commented as `should not be called directly`, it is unclear what will happen if we train it.
    def forward(
        self,
        image_embeddings: torch.Tensor,
        point_coords: torch.Tensor,
        point_labels: torch.Tensor,
        mask_input: torch.Tensor,
        has_mask_input: torch.Tensor,
        orig_im_size: torch.Tensor,
    ):
        sparse_embedding = self._embed_points(point_coords, point_labels)
        dense_embedding = self._embed_masks(mask_input, has_mask_input)

        masks, scores = self.model.mask_decoder.predict_masks(
            image_embeddings=image_embeddings,
            image_pe=self.model.prompt_encoder.get_dense_pe(),
            sparse_prompt_embeddings=sparse_embedding,
            dense_prompt_embeddings=dense_embedding,
        )

        if self.use_stability_score:
            scores = calculate_stability_score(masks, self.model.mask_threshold, self.stability_score_offset)

        if self.return_single_mask:
            masks, scores = self.select_masks(masks, scores, point_coords.shape[1])

        upscaled_masks = self.mask_postprocessing(masks, orig_im_size)

        if self.return_extra_metrics:
            stability_scores = calculate_stability_score(
                upscaled_masks, self.model.mask_threshold, self.stability_score_offset
            )
            areas = (upscaled_masks > self.model.mask_threshold).sum(-1).sum(-1)
            return upscaled_masks, scores, stability_scores, areas, masks

        return upscaled_masks, scores, masks


class Trainer:
    def __init__(self, args: Argument, sam: Sam, ds: Dataset) -> None:
        self.args = args
        self.sam = sam
        self.ds = ds

        self.optimizer = torch.optim.Adam(sam.mask_decoder.parameters(), lr=args.lr, weight_decay=args.wd)
        self.loss_fn = binary_cross_entropy

    def train(self) -> None:
        for eidx in range(self.args.num_epoch):
            loss = self._train_epoch()
            logging.info("finished epoch %d/%d with loss %f", eidx + 1, self.args.num_epoch, loss)

    def _train_epoch(self) -> float:
        losses: List[float] = []

        onnx_model = SamOnnxModelTrainable(self.sam, return_single_mask=True)

        for rec in self.ds.records:
            # point prompts
            n = len(rec.point_prompts)
            point_coors = np.zeros(2 * (n + 1))
            point_types = np.zeros(n + 1)
            for i, p in enumerate(rec.point_prompts):
                point_coors[2 * i] = p.x
                point_coors[2 * i + 1] = p.y
                point_types[i] = p.type

            # Add in the extra point/label when only clicks and no box  at (0, 0) with label -1.
            point_coors[2 * n] = 0
            point_coors[2 * n + 1] = 0
            point_types[n] = -1

            # transform and move
            point_coors = self.ds.transform.apply_coords(point_coors, rec.image_size)  # type: ignore
            point_coors = torch.as_tensor(point_coors, dtype=torch.float, device=self.args.device).reshape(1, n + 1, 2)
            point_types = torch.as_tensor(point_types, dtype=torch.float, device=self.args.device).reshape(1, n + 1)

            embed_size = self.sam.prompt_encoder.image_embedding_size
            mask_input_size = [4 * x for x in embed_size]
            preds = onnx_model(
                image_embeddings=rec.embedding,
                point_coords=point_coors,
                point_labels=point_types,
                orig_im_size=torch.tensor(rec.image_size, dtype=torch.float, device=self.args.device),
                mask_input=torch.randn(1, 1, *mask_input_size, dtype=torch.float, device=self.args.device),
                has_mask_input=torch.tensor([1], dtype=torch.float, device=self.args.device),
            )
            mask_logit = preds[0]
            mask_probs = torch.sigmoid(mask_logit)

            loss = self.loss_fn(mask_probs, rec.mask)
            self.optimizer.zero_grad()
            loss.backward()  # type: ignore
            self.optimizer.step()
            losses.append(loss.item())
        return mean(losses)


def start(args: Argument, samples: List[Any]):
    # download image
    image_urls: Set[str] = set()
    for sample in samples:
        image_urls.add(sample["imageUrl"])
    for image_url in image_urls:
        download_image(args, image_url)

    # prepare model
    mtype = args.model_type.value
    mckpt = args.checkpoint
    logging.info("loading model %s at %s", mtype, mckpt)
    sam = sam_model_registry[mtype](checkpoint=mckpt)
    if args.device is not None:
        logging.info("moving model to %s", args.device)
        sam.to(device=args.device)  # type: ignore

    # prepare dataset
    ds = prepare_dataset(args, sam, samples)
    logging.info("loaded %d records", len(ds.records))

    # train
    trainer = Trainer(args, sam, ds)
    trainer.train()

    # save
    save_quantized_onnx(sam.to("cpu"), args.output)


def main():
    args = Argument(underscores_to_dashes=True).parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), None),
        datefmt="%Y-%m-%d %H:%M:%S",
        format="%(asctime)s.%(msecs)03d %(levelname)s %(message)s",
    )

    samples: List[Any] = []
    dir_path = os.path.join(args.sample_dir, "*.json")
    for file_path in glob.glob(dir_path):
        with open(file_path, encoding="utf-8") as f:
            sample = json.load(f)
            samples.append(sample)
    start(args, samples)


if __name__ == "__main__":
    main()
