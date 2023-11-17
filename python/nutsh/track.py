import os
import logging
from typing import Callable

import grpc
from concurrent import futures

from .lib.logging import init_logging
from .track_grpc import TrackService, Tracker
from .proto.schema.v1.train_pb2 import Mask
from .proto.service.v1 import track_pb2_grpc

class Service:
    def __init__(self, workspace: str, on_reqeust: Callable[[str, Mask], Tracker]):
        self.workspace = workspace
        self.on_reqeust = on_reqeust

    def start(self, port: int) -> None:
        init_logging()

        service = TrackService(
            workspace=self.workspace,
            on_reqeust=self.on_reqeust
        )

        logging.info(f"track stream service starts listening on :{port}")
        num_workers = os.cpu_count()
        server = grpc.server( # type: ignore
            futures.ThreadPoolExecutor(max_workers=num_workers),
            options=[
                ('grpc.max_receive_message_length', 1024 * 1024 * 1024) # allows 1K images each being of 1MB
            ]
        )
        track_pb2_grpc.add_TrackServiceServicer_to_server(service, server) # type: ignore
        server.add_insecure_port(f'[::]:{port}')
        server.start()
        server.wait_for_termination()
