import {MaskComponent, RunLengthEncoding} from 'type/annotation';
import {linearInterpoation} from './util';
import {encodeRLE, rleToImage} from '../rle';

export function interpolateMask(m1: MaskComponent, m2: MaskComponent, step: number): MaskComponent[] {
  const {width: w1, height: h1} = m1.rle.size;
  const {width: w2, height: h2} = m2.rle.size;

  function createCanvas(rle: RunLengthEncoding): HTMLCanvasElement {
    const {width: w, height: h} = rle.size;
    const im = rleToImage(rle, [0, 0, 0, 255]);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(im, 0, 0);
    return canvas;
  }

  const canvas1 = createCanvas(m1.rle);
  const canvas2 = createCanvas(m2.rle);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(w1, w2);
  canvas.height = Math.max(h1, h2);
  const ctx = canvas.getContext('2d')!;

  const components: MaskComponent[] = [];
  for (let k = 0; k < step; k++) {
    const r = (k + 1) / (step + 1);
    const [w, h] = [Math.round(w1 + (w2 - w1) * r), Math.round(h1 + (h2 - h1) * r)];
    ctx.clearRect(0, 0, w, h);

    ctx.globalAlpha = 1 - r;
    ctx.drawImage(canvas1, 0, 0, w, h);
    ctx.globalAlpha = r;
    ctx.drawImage(canvas2, 0, 0, w, h);

    const data = ctx.getImageData(0, 0, w, h).data;
    const mask = new Uint8Array(w * h);
    for (let i = 0, ridx = 0; i < data.length; i += 4, ridx++) {
      const alpha = data[i + 3];

      // turn row-major to column-major
      const [y, x] = [Math.floor(ridx / w), ridx % w];
      const cidx = x * h + y;
      mask[cidx] = alpha >= 128 ? 1 : 0;
    }

    const counts = encodeRLE(mask);
    const {x, y} = linearInterpoation(m1.offset, m2.offset, r);
    components.push({
      type: 'mask',
      rle: {counts, size: {width: w, height: h}},
      offset: {x: Math.round(x), y: Math.round(y)},
    });
  }

  canvas1.remove();
  canvas2.remove();
  canvas.remove();

  return components;
}
