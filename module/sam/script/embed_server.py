# type: ignore

import os
import time
import logging
from typing import Optional
from enum import Enum

import cv2
import numpy as np
from flask import Flask, request
from segment_anything import SamPredictor, sam_model_registry
from tap import Tap


class ModelType(Enum):
    """Different SAM model types."""

    VIT_H = "vit_h"
    VIT_L = "vit_l"
    VIT_B = "vit_b"


class Argument(Tap):
    log_level: str = "INFO"  # Log level.
    log_prefix: str = "" # Log prefix.
    model_type: ModelType = ModelType.VIT_H  # The SAM model type to use.
    model_checkpoint: str  # Path to the SAM model checkpoint.
    device: Optional[str] = None  # Device to run the model.
    port: int = 5000  # Listening port


def init(args: Argument):
    logging.info("loading model %s at %s", args.model_type.value, args.model_checkpoint)
    sam = sam_model_registry[args.model_type.value](checkpoint=args.model_checkpoint)
    if args.device is not None:
        logging.info("moving model to %s", args.device)
        sam.to(device=args.device)

    predictor = SamPredictor(sam)
    return predictor


app = Flask(__name__)


@app.route("/embed", methods=["POST"])
def embed():
    if request.method == "POST":
        body = request.get_json()

        image_path = body["input"]
        logging.info("calculating embedding for image %s", image_path)
        image = cv2.imread(image_path)

        crop = body["crop"]
        if crop != "":
            # it is an internal server, thus we do not handle errors, which are not expected to occur
            x, y, w, h = [int(value) for value in crop.split(",")]
            image = image[y : y + h, x : x + w]
            logging.info("cropped image at (x, y, w, h) = (%d, %d, %d, %d)", x, y, w, h)

        start = time.time()
        predictor = app.config["predictor"]
        predictor.set_image(image)
        embedded = predictor.get_image_embedding().cpu().numpy()
        logging.info("embeding finished and cost %fs", time.time() - start)

        # The request might be cancalled by the caller which will remove the temporary saving directory
        # thus we check if the intended saving directory still exists.
        save_path = body["output"]
        if os.path.exists(os.path.dirname(save_path)):    
            np.save(save_path, embedded)
            logging.info("embedded image saved at %s", save_path)
        else:
            logging.info("skipped saving embedding at %s", save_path)

        return ""


def main():
    args = Argument(underscores_to_dashes=True).parse_args()

    logging.basicConfig(
        level=getattr(logging, args.log_level.upper(), None),
        datefmt="%Y-%m-%d %H:%M:%S",
        format=f"%(asctime)s.%(msecs)03d %(levelname)s [{args.log_prefix}] %(message)s",
    )

    predictor = init(args)
    app.config["predictor"] = predictor
    app.run(port=args.port, debug=False, use_reloader=False)


if __name__ == "__main__":
    main()
