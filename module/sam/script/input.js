// For the input to the SAM model, check https://github.com/facebookresearch/segment-anything/blob/6fdee8f2727f4506cfbbe553e23b895e27956588/notebooks/onnx_model_example.ipynb#L416-L422
//
// - `image_embeddings`: The image embedding from `predictor.get_image_embedding()`. Has a batch index of length 1.
// - `point_coords`: Coordinates of sparse input prompts, corresponding to both point inputs and box inputs. Boxes are encoded using two points, one for the top-left corner and one for the bottom-right corner. *Coordinates must already be transformed to long-side 1024.* Has a batch index of length 1.
// - `point_labels`: Labels for the sparse input prompts. 0 is a negative input point, 1 is a positive input point, 2 is a top-left box corner, 3 is a bottom-right box corner, and -1 is a padding point. *If there is no box input, a single padding point with label -1 and coordinates (0.0, 0.0) should be concatenated.*
// - `mask_input`: A mask input to the model with shape 1x1x256x256. This must be supplied even if there is no mask input. In this case, it can just be zeros.
// - `has_mask_input`: An indicator for the mask input. 1 indicates a mask input, 0 indicates no mask input.
// - `orig_im_size`: The size of the input image in (H,W) format, before any transformation.
//
// The following code is based on https://github.com/facebookresearch/segment-anything/tree/6fdee8f2727f4506cfbbe553e23b895e27956588/demo

(input, Tensor) => {
  const { embedding, size, clicks } = input;

  // Input images to SAM must be resized so the longest side is 1024
  const LONG_SIDE_LENGTH = 1024;

  const [w, h] = size;
  const r = LONG_SIDE_LENGTH / Math.max(w, h);

  // Check there are input click prompts
  const n = clicks.length;

  // If there is no box input, a single padding point with
  // label -1 and coordinates (0.0, 0.0) should be concatenated
  // so initialize the array to support (n + 1) points.
  const coords = new Float32Array(2 * (n + 1));
  const labels = new Float32Array(n + 1);

  // Add clicks and scale to what SAM expects
  for (let i = 0; i < n; i++) {
    const { x, y, isPositive } = clicks[i];
    coords[2 * i] = x * r;
    coords[2 * i + 1] = y * r;
    labels[i] = isPositive ? 1 : 0;
  }

  // Add in the extra point/label when only clicks and no box
  // The extra point is at (0, 0) with label -1
  coords[2 * n] = 0.0;
  coords[2 * n + 1] = 0.0;
  labels[n] = -1;

  // Create the tensor
  const coordsTensor = new Tensor("float32", coords, [1, n + 1, 2]);
  const labelsTensor = new Tensor("float32", labels, [1, n + 1]);
  const sizeTensor = new Tensor("float32", [h, w]);

  // There is no previous mask, so default to an empty tensor
  const maskInput = new Tensor(
    "float32",
    new Float32Array(256 * 256),
    [1, 1, 256, 256]
  );

  // There is no previous mask, so default to 0
  const hasMaskInput = new Tensor("float32", [0]);

  return {
    image_embeddings: embedding,
    point_coords: coordsTensor,
    point_labels: labelsTensor,
    orig_im_size: sizeTensor,
    mask_input: maskInput,
    has_mask_input: hasMaskInput,
  };
};
