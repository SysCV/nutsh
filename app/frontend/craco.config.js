// eslint-disable-next-line node/no-unpublished-require
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  webpack: {
    configure: config => {
      config.plugins.push(
        new CopyWebpackPlugin({
          patterns: [
            {
              from: 'node_modules/onnxruntime-web/dist/*.wasm',
              to: 'static/js/[name][ext]',
            },
          ],
        })
      );
      return config;
    },
  },
  devServer: {
    // Enable using `SharedArrayBuffer` to speed up ONNX model inference.
    // To check if it is working, observe if it is `ort-wasm-simd-threaded.wasm` or `ort-wasm-simd.wasm` that is downloaded.
    // https://developer.chrome.com/blog/enabling-shared-array-buffer/#cross-origin-isolation
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
};
