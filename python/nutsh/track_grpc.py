import os
import logging
from abc import ABC, abstractmethod
from typing import Callable, Iterator, List

from grpc import ServicerContext, StatusCode

from .proto.service.v1 import track_pb2_grpc
from .proto.service.v1.track_pb2 import FrameMask, TrackRequest, TrackResponse
from .proto.schema.v1.train_pb2 import Mask
from .lib.image import prepare_images

class Tracker(ABC):
    @abstractmethod
    def predict(self, im_path: str) -> Mask:
        """Predict on the given image and return a mask."""
        pass


class TrackService(track_pb2_grpc.TrackServiceServicer):
    def __init__(self, workspace: str, on_reqeust: Callable[[str, Mask], Tracker]):
        self.workspace = workspace
        self.on_reqeust = on_reqeust

    def Track(self, request: TrackRequest, context: ServicerContext) -> TrackResponse:
        logging.info("received a Track request")
        im_paths = self._prepare_images(request=request, context=context)

        # predict
        tracker = self.on_reqeust(im_paths[0], request.first_image_mask)
        masks = [tracker.predict(im_path) for im_path in im_paths[1:]]

        return TrackResponse(subsequent_image_masks=masks)

    def TrackStream(self, request: TrackRequest, context: ServicerContext) -> Iterator[FrameMask]:
        logging.info("received a TrackStream request")
        im_paths = self._prepare_images(request=request, context=context)

        # predict
        tracker = self.on_reqeust(im_paths[0], request.first_image_mask)
        for i, im_path in enumerate(im_paths[1:]):
            mask = tracker.predict(im_path)
            yield FrameMask(frame_index=i+1, mask=mask)

    def _prepare_images(self, request: TrackRequest, context: ServicerContext) -> List[str]:
        im_uris = [request.first_image_uri, *request.subsequent_image_uris]
        im_dir = os.path.join(self.workspace, "images")
        if not os.path.exists(im_dir):
            os.makedirs(im_dir)
        try:
            im_paths = prepare_images(im_dir, im_uris)
        except Exception as e:
            logging.error(f"failed to prepare images: {e}")
            context.abort_with_status(StatusCode.INTERNAL.value)

        return im_paths