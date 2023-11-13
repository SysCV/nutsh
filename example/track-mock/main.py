import argparse
import logging
import time
import tempfile

from nutsh.track import Service, Tracker
from nutsh.proto.schema.v1.train_pb2 import Mask


class MockTracker(Tracker):
    def __init__(self, mask: Mask):
        self.mask = mask
        self.idx = 0

    def predict(self, im_path: str) -> Mask:
        logging.info("predicting %s" % im_path)

        # mock by sleeping for 1 second
        time.sleep(0.1)

        self.idx += 1
        if self.idx >= 10:
            # return an empty mask after some frames
            return Mask()

        # return a fixed initial mask
        return self.mask


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace", type=str, default=tempfile.gettempdir())
    parser.add_argument("--port", type=int, default=12348)
    args = parser.parse_args()

    def new_tracker(first_image_path: str, first_image_mask: Mask) -> Tracker:
        logging.info("start a new tracking process: %s" % first_image_path)
        return MockTracker(mask=first_image_mask)

    ser = Service(workspace=args.workspace, on_reqeust=new_tracker)
    ser.start(args.port)


if __name__ == "__main__":
    main()
