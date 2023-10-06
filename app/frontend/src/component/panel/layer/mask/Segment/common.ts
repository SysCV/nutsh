import npyjs from 'npyjs';
import {InferenceSession, Tensor} from 'onnxruntime-web';
import {OnlineSegmentationDecoder} from 'openapi/nutsh';

export type Decoder = OnlineSegmentationDecoder & {
  session: InferenceSession;
};

export function downloadTensor(url: string): Promise<Tensor> {
  return new Promise(resolve => {
    const npLoader = new npyjs();
    npLoader.load(url).then(({dtype, data, shape}) => {
      const tensor = new Tensor(dtype, data as Tensor.DataType, shape);
      resolve(tensor);
    });
  });
}

// The server has no idea of under what host name it is serving, which only the client knows.
// In particular, a url to a local data may not be downloadable by the server.
// Therefore, the client needs to correct a local-data url to something the server is aware of.
export function correctSliceUrl(url: string): string {
  const {origin} = window.location;
  const dataPrefix = `${origin}/data/`;
  if (url.startsWith(dataPrefix)) {
    const rel = url.substring(dataPrefix.length);
    return `data://${rel}`;
  }
  return url;
}
