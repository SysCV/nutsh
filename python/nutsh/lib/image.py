import os
import requests
import hashlib
import base64
import logging
import concurrent.futures
from urllib.parse import urlparse
from typing import List

# assuming logging configuration is already set somewhere
logger = logging.getLogger(__name__)

base64_jpeg_prefix = "data:image/jpeg;base64,"
base64_png_prefix = "data:image/png;base64,"


class ImagePreparer:
    def __init__(self, uri: str):
        self.uri = uri

    def prepare(self, save_dir: str):
        name = hashlib.md5(self.uri.encode('utf-8')).hexdigest() + self._get_extension()
        path = os.path.join(save_dir, name)

        if os.path.exists(path):
            return path
        if self.uri.startswith((base64_jpeg_prefix, base64_png_prefix)):
            return self._save_base64(path)
        return self._download(path)

    def _get_extension(self):
        if self.uri.startswith(base64_jpeg_prefix):
            return ".jpg"
        if self.uri.startswith(base64_png_prefix):
            return ".png"
        return os.path.splitext(urlparse(self.uri).path)[1]

    def _save_base64(self, save_path: str):
        logger.info("saving base64 image to path: %s", save_path)
        prefix = base64_jpeg_prefix if self.uri.startswith(base64_jpeg_prefix) else base64_png_prefix
        im_base64 = self.uri[len(prefix):]
        image_data = base64.b64decode(im_base64)
        with open(save_path, 'wb') as f:
            f.write(image_data)
        return save_path

    def _download(self, save_path: str):
        logger.info("downloading image from url: %s to path: %s", self.uri, save_path)
        response = requests.get(self.uri, stream=True)
        if response.status_code != 200:
            raise ValueError("failed to download {}, status code: {}".format(self.uri, response.status_code))
        with open(save_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        return save_path


def prepare_images(save_dir: str, im_uris: List[str]):
    num_workers = os.cpu_count()
    paths: List[str] = [""] * len(im_uris)
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_workers) as executor:
        future_to_index = {executor.submit(ImagePreparer(uri).prepare, save_dir): idx for idx, uri in enumerate(im_uris)}
        for future in concurrent.futures.as_completed(future_to_index):
            index = future_to_index[future]
            paths[index] = future.result()
    return paths
