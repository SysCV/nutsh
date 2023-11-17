import os
import logging

def init_logging():
    log_level = os.environ.get('LOG_LEVEL', 'INFO')
    logging.basicConfig(
        level=getattr(logging, log_level, None),
        datefmt="%Y-%m-%d %H:%M:%S",
        format="%(asctime)s.%(msecs)03d %(levelname)s %(message)s",
    )
