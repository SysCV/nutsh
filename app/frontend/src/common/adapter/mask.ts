import {DrawStyle} from 'common/constant';
import {ViewportTransform} from 'state/annotate/render/viewport';
import {MaskComponent, Coordinates, ComponentDetail, RunLengthEncoding} from 'type/annotation';
import {ComponentAdapter, Proximity, ScalabelExport} from './base';
import {coordinatesImageToCanvas, polygonInPolygon} from 'common/geometry';
import {isForeground, rleToImage, rleCountsToStringCOCO} from 'common/algorithm/rle';
import {interpolateMask} from 'common/algorithm/interpolate/mask';

export class Mask extends ComponentAdapter {
  c: MaskComponent;

  constructor(component: MaskComponent) {
    super();
    this.c = component;
  }

  closure(): Coordinates[] {
    const {width: w, height: h} = this.c.rle.size;
    const {x, y} = this.c.offset;
    return [
      {x, y},
      {x: x + w, y: y + h},
    ];
  }

  centroid(): Coordinates {
    // find the point at the middle index
    // TODO(hxu): determine the centroid of a mask in a better way.
    const {counts} = this.c.rle;
    const {height} = this.c.rle.size;

    let n = 0;
    counts.forEach((c, i) => {
      if (i % 2 === 1) n += c;
    });

    let m = 0;
    let idx = 0;
    for (const [i, c] of counts.entries()) {
      if (i % 2 === 0) {
        idx += c;
        continue;
      }
      if ((m + c) * 2 < n) {
        idx += c;
        m += c;
        continue;
      }
      idx += Math.floor(n / 2) - m;
      break;
    }

    const {x: dx, y: dy} = this.c.offset;
    const [x, y] = [Math.floor(idx / height), idx % height];
    return {x: x + dx, y: y + dy};
  }

  convertToScalabel(): ScalabelExport {
    const {counts, size} = this.c.rle;
    const {width, height} = size;
    const {x, y} = this.c.offset;
    const countsStr = rleCountsToStringCOCO(counts);
    return {
      rle: {counts: countsStr, size: [height, width], offset: [x, y]},
    };
  }

  proximity(): Proximity | undefined {
    // mask does not employ any proximity
    return undefined;
  }

  contain(coorImage: Coordinates): boolean {
    const {x, y} = coorImage;
    const [i, j] = [Math.round(x), Math.round(y)];

    const {x: x0, y: y0} = this.c.offset;
    const {width, height} = this.c.rle.size;

    // check if within the box
    if (i < x0 || i >= x0 + width || j < y0 || j > y0 + height) {
      return false;
    }

    // column major
    const idx = (i - x0) * height + (j - y0);
    return isForeground(this.c.rle.counts, idx);
  }

  render(ctx: CanvasRenderingContext2D, transform: ViewportTransform, style: DrawStyle): void {
    const {rle, offset} = this.c;
    const {x, y} = offset;
    const {width: imw, height: imh} = rle.size;

    const p = coordinatesImageToCanvas({x, y}, transform);
    const q = coordinatesImageToCanvas({x: x + imw, y: y + imh}, transform);

    const im = rleToImage(rle, style.fill);

    // boundary
    for (let j = 0; j < im.height; j++) {
      for (let i = 0; i < im.width; i++) {
        if (isOnBoundary(im, i, j)) {
          const idx = j * im.width + i;
          const [r, g, b, a] = style.stroke;
          im.data[4 * idx + 0] = r;
          im.data[4 * idx + 1] = g;
          im.data[4 * idx + 2] = b;
          im.data[4 * idx + 3] = a;
        }
      }
    }

    const canvas2 = document.createElement('canvas');
    const ctx2 = canvas2.getContext('2d')!;
    canvas2.width = imw;
    canvas2.height = imh;
    ctx2.putImageData(im, 0, 0);

    // draw onto the given context
    ctx.drawImage(canvas2, p.x, p.y, q.x - p.x, q.y - p.y);

    // clean
    canvas2.remove();
  }

  svg(style: DrawStyle): string {
    const {rle, offset} = this.c;
    const dataUrl = maskElement(rle, style);
    const {width, height} = rle.size;
    const {x, y} = offset;
    return `<image href="${dataUrl}" width="${width}" height="${height}" x="${x}" y="${y}" image-rendering="pixelated" />`;
  }

  isWithin(container: Coordinates[]): boolean {
    const {width: w, height: h} = this.c.rle.size;
    const {x, y} = this.c.offset;
    return polygonInPolygon(
      [
        {x, y},
        {x: x + w, y},
        {x: x + w, y: y + h},
        {x, y: y + h},
      ],
      container
    );
  }

  translate(offset: Coordinates): ComponentDetail {
    const {x, y} = this.c.offset;
    const {x: dx, y: dy} = offset;
    return {
      ...this.c,
      offset: {x: Math.round(x + dx), y: Math.round(y + dy)},
    };
  }

  interpolate(other: ComponentDetail, step: number): ComponentDetail[] {
    if (other.type !== this.c.type) return [];
    return interpolateMask(this.c, other, step);
  }
}

// `maskElement` is heavy, thus we globally cache the result. Otherwise, dragging will be very laggy.
const maskElementCache = new Map<string, string>();
function maskElement(rle: RunLengthEncoding, style: DrawStyle): string {
  const key = JSON.stringify({rle, style});
  const cached = maskElementCache.get(key);
  if (cached) return cached;

  const {width, height} = rle.size;
  const im = rleToImage(rle, style.fill);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.putImageData(im, 0, 0);
  const dataUrl = canvas.toDataURL();
  canvas.remove();

  maskElementCache.set(key, dataUrl);
  return dataUrl;
}

function isOnBoundary(im: ImageData, i: number, j: number): boolean {
  const {width: w, height: h} = im;
  if (im.data[4 * (j * w + i) + 3] === 0) {
    return false;
  }

  let n = 0;
  [
    [i + 1, j],
    [i - 1, j],
    [i, j + 1],
    [i, j - 1],
  ].forEach(([x, y]) => {
    if (x < 0 || x >= w || y < 0 || y >= h) {
      return;
    }
    const idx = y * w + x;
    if (im.data[4 * idx + 3] > 0) {
      n++;
    }
  });
  return n < 4 && n > 0;
}
