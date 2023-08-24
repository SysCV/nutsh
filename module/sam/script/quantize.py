# type: ignore

import os
import uuid
import logging
import warnings
import tempfile
from enum import Enum

import torch
from tap import Tap
from onnxruntime.quantization import QuantType
from onnxruntime.quantization.quantize import quantize_dynamic

from segment_anything import sam_model_registry
from segment_anything.utils.onnx import SamOnnxModel


class ModelType(Enum):
    """Different SAM model types."""

    VIT_H = "vit_h"
    VIT_L = "vit_l"
    VIT_B = "vit_b"


class Argument(Tap):
    log_level: str = "INFO"  # Log level.
    model_type: ModelType  # The SAM model type to use.
    checkpoint: str  # Path to the SAM model checkpoint.
    output: str  # Path to the quantized checkpoint.


def export_decoder_onnx(sam, save_path: str):
    onnx_model = SamOnnxModel(sam, return_single_mask=True)

    dynamic_axes = {
        "point_coords": {1: "num_points"},
        "point_labels": {1: "num_points"},
    }

    embed_dim = sam.prompt_encoder.embed_dim
    embed_size = sam.prompt_encoder.image_embedding_size
    mask_input_size = [4 * x for x in embed_size]
    dummy_inputs = {
        "image_embeddings": torch.randn(1, embed_dim, *embed_size, dtype=torch.float),
        "point_coords": torch.randint(low=0, high=1024, size=(1, 5, 2), dtype=torch.float),
        "point_labels": torch.randint(low=0, high=4, size=(1, 5), dtype=torch.float),
        "mask_input": torch.randn(1, 1, *mask_input_size, dtype=torch.float),
        "has_mask_input": torch.tensor([1], dtype=torch.float),
        "orig_im_size": torch.tensor([1500, 2250], dtype=torch.float),
    }
    output_names = ["masks", "iou_predictions", "low_res_masks"]

    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=torch.jit.TracerWarning)
        warnings.filterwarnings("ignore", category=UserWarning)
        with open(save_path, "wb") as f:
            torch.onnx.export(
                onnx_model,
                tuple(dummy_inputs.values()),
                f,
                export_params=True,
                verbose=False,
                opset_version=17,
                do_constant_folding=True,
                input_names=list(dummy_inputs.keys()),
                output_names=output_names,
                dynamic_axes=dynamic_axes,
            )


def save_quantized_onnx(sam, save_path: str):
    salt = uuid.uuid4()
    onnx_path = os.path.join(tempfile.gettempdir(), f"sam_decoder_{salt}.onnx")

    logging.info("exporting original model to ONNX at %s", onnx_path)
    export_decoder_onnx(sam, onnx_path)

    logging.info("quantizing model")
    quantize_dynamic(
        model_input=onnx_path,
        model_output=save_path,
        optimize_model=True,
        per_channel=False,
        reduce_range=False,
        weight_type=QuantType.QUInt8,
    )
    os.remove(onnx_path)
    logging.info("quantized model saved at %s", save_path)


def main():
    args = Argument(underscores_to_dashes=True).parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), None),
        datefmt="%Y-%m-%d %H:%M:%S",
        format="%(asctime)s.%(msecs)03d %(levelname)s %(message)s",
    )

    mtype = args.model_type.value
    logging.info("loading model %s at %s", mtype, args.checkpoint)
    sam = sam_model_registry[mtype](checkpoint=args.checkpoint)

    save_quantized_onnx(sam, args.output)


if __name__ == "__main__":
    main()
