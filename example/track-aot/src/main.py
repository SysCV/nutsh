import argparse
import gc
import cv2
import numpy as np
import torch
from pycocotools import mask as coco_mask

from nutsh.track import Service, Tracker
from nutsh.proto.schema.v1.train_pb2 import Mask
from nutsh.proto.schema.v1.common_pb2 import GridSize

from .tracker_nutsh import NutshTracker


class TrackerImpl(Tracker):
    def __init__(self, tracker: NutshTracker):
        self.tracker = tracker

    def predict(self, im_path: str) -> Mask:
        torch.cuda.empty_cache()
        gc.collect()

        frame = cv2.imread(im_path)
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        pred_mask = self.tracker.track(frame, update_memory=True)

        rle = coco_mask.encode(np.asfortranarray(pred_mask))
        counts = rle["counts"]
        assert isinstance(counts, bytes)

        coco_encoded_rle = counts.decode("utf-8")
        size = GridSize(width=rle["size"][1], height=rle["size"][0])
        return Mask(coco_encoded_rle=coco_encoded_rle, size=size)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--gpu", type=int, default=0)
    parser.add_argument("--model-path", type=str, default="./local/ckpt/R50_DeAOTL_PRE_YTB_DAV.pth")
    parser.add_argument("--workspace", type=str, default="./local/workspace")
    parser.add_argument("--port", type=int, default=12348)
    args = parser.parse_args()

    def new_tracker(first_image_path: str, first_image_mask: Mask) -> Tracker:
        tracker = NutshTracker(
            {
                "gpu_id": args.gpu,
                "model_path": args.model_path,
                "phase": "PRE_YTB_DAV",
                "model": "r50_deaotl",
                "long_term_mem_gap": 9999,
                "max_len_long_term": 9999,
            }
        )
        tracker.restart_tracker()

        # read first frame mask
        m = first_image_mask
        rle_str, mw, mh = m.coco_encoded_rle, m.size.width, m.size.height
        mask = coco_mask.decode({"size": [mh, mw], "counts": rle_str})

        # read first frame
        first_frame = cv2.imread(first_image_path)
        first_frame = cv2.cvtColor(first_frame, cv2.COLOR_BGR2RGB)
        tracker.add_reference(frame=first_frame, mask=mask)

        return TrackerImpl(tracker=tracker)

    ser = Service(workspace=args.workspace, on_reqeust=new_tracker)
    ser.start(args.port)


if __name__ == "__main__":
    main()
