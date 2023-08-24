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
