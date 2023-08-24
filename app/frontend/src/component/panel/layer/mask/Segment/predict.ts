import {InferenceSession, Tensor} from 'onnxruntime-web';
import {useCallback, useMemo} from 'react';

export interface Click {
  x: number;
  y: number;
  isPositive: boolean;
}

export interface Input {
  embedding: Tensor;
  size: [number, number];
  clicks: Click[];
}

export function usePredict(
  decoder: InferenceSession,
  decoderFeedJs: string,
  embedding: Tensor,
  imageSize: [number, number]
) {
  // WARN(hxu): using `eval` may not be a good idea and extra works may need to make it safe.
  const makeDecoderFeeds = useMemo(() => {
    try {
      return eval(decoderFeedJs);
    } catch (e) {
      console.error(e);
      return undefined;
    }
  }, [decoderFeedJs]);

  const [imw, imh] = imageSize;
  return useCallback(
    (clicks: Click[]) => {
      if (!makeDecoderFeeds) {
        return new Promise<Tensor>((_, reject) => {
          reject(new Error('invalid decoder feed script'));
        });
      }

      const input: Input = {clicks, embedding, size: [imw, imh]};
      const feeds = makeDecoderFeeds(input, Tensor);
      return new Promise<Tensor>(resolve => {
        console.time('inference');
        decoder.run(feeds).then(results => {
          console.timeEnd('inference');
          const output = results[decoder.outputNames[0]];
          resolve(output);
        });
      });
    },
    [embedding, imw, imh, makeDecoderFeeds, decoder]
  );
}

export function useOutputToMask(color: [number, number, number]) {
  return useCallback(
    (output: Tensor) => {
      return arrayToImageData(
        output.data as Float32Array /* TODO(hxu): remove hard code */,
        output.dims[2],
        output.dims[3],
        color
      );
    },
    [color]
  );
}

// Convert the onnx model mask prediction to ImageData
function arrayToImageData(
  input: Float32Array,
  width: number,
  height: number,
  rgb: [number, number, number]
): ImageData {
  const [r, g, b] = rgb;
  const arr = new Uint8ClampedArray(4 * width * height).fill(0);
  for (let i = 0; i < input.length; i++) {
    // Threshold the onnx model mask prediction at 0.0. This is equivalent to thresholding the mask using
    // predictor.model.mask_threshold in python.
    if (input[i] > 0.0) {
      arr[4 * i + 0] = r;
      arr[4 * i + 1] = g;
      arr[4 * i + 2] = b;
      arr[4 * i + 3] = 255;
    }
  }
  return new ImageData(arr, height, width);
}
