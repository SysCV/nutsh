import {RunLengthEncoding} from 'type/annotation';

export function isForeground(counts: number[], index: number): boolean {
  let k = 0;
  let m = 0;
  for (const [i, c] of counts.entries()) {
    if (index >= m + c) {
      m += c;
      continue;
    }
    k = i;
    break;
  }

  return k % 2 === 1;
}

export function encodeRLE(mask: Uint8Array): number[] {
  const counts: number[] = [];

  const N = mask.length;
  let n = 0;
  for (let i = 0; i < N; i++) {
    if (mask[i] === 0) {
      n++;
      continue;
    }
    counts.push(n);
    n = 1;
    while (i + 1 < N && mask[i] === mask[i + 1]) {
      n++;
      i++;
    }
    counts.push(n);
    n = 0;
  }
  if (n > 0) {
    counts.push(n);
  }

  return counts;
}

export function rleToImage(rle: RunLengthEncoding, rgba: [number, number, number, number]): ImageData {
  const [r, g, b, a] = rgba;
  const {width, height} = rle.size;
  const im = new ImageData(width, height);
  decodeRLE(rle, (i, j) => {
    const idx = j * width + i;
    im.data[idx * 4 + 0] = r;
    im.data[idx * 4 + 1] = g;
    im.data[idx * 4 + 2] = b;
    im.data[idx * 4 + 3] = a;
  });
  return im;
}

export function decodeRLE(rle: RunLengthEncoding, onForeground: (i: number, j: number) => void) {
  const {height} = rle.size;
  let idx = 0;

  const {counts} = rle;
  for (let k = 1; k < counts.length; k += 2) {
    // skip background
    idx += counts[k - 1];

    // draw foreground
    for (let _ = 0; _ < counts[k]; _++) {
      const [i, j] = [Math.floor(idx / height), idx % height];
      onForeground(i, j);
      idx++;
    }
  }
}

// COCO uses a modified LEB128 encoding algorithm to further encode the RLE-encoded mask.
// https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/common/maskApi.c#L204
export function rleCountsToStringCOCO(counts: number[]): string {
  const m = counts.length;
  const s = new Uint8Array(m * 6);
  let p = 0;
  for (let i = 0; i < m; i++) {
    let x = counts[i];
    if (i > 2) {
      x -= counts[i - 2];
    }
    let more = true;
    while (more) {
      let c = x & 0x1f;
      x >>= 5;
      more = c & 0x10 ? x !== -1 : x !== 0;
      if (more) c |= 0x20;
      c += 48;
      s[p] = c;
      p++;
    }
  }
  let str = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === 0) {
      break;
    }
    str += String.fromCharCode(s[i]);
  }
  return str;
}

// https://github.com/cocodataset/cocoapi/blob/8c9bcc3cf640524c4c20a9c40e89cb6a2f2fa0e9/common/maskApi.c#L218
export function rleCountsFromStringCOCO(str: string): number[] {
  const m = str.length;
  const s = new Uint8Array(m);
  for (let i = 0; i < m; i++) {
    s[i] = str.charCodeAt(i);
  }

  const cnts = new Uint32Array(m);
  let p = 0;
  let n = 0;
  while (s[p] > 0) {
    let x = 0;
    let k = 0;
    let more = true;
    while (more) {
      const c = s[p] - 48;
      x |= (c & 0x1f) << (5 * k);
      more = (c & 0x20) > 0;
      p++;
      k++;
      if (!more && c & 0x10) {
        x |= -1 << (5 * k);
      }
    }
    if (n > 2) {
      x += cnts[n - 2];
    }
    cnts[n] = x;
    n++;
  }
  return Array.from(cnts.slice(0, n));
}

export function shrink(rle: RunLengthEncoding): {rle: RunLengthEncoding; offset: {x: number; y: number}} | undefined {
  const {counts, size} = rle;
  let [xMin, xMax, yMin, yMax] = [Number.MAX_VALUE, -1, Number.MAX_VALUE, -1];
  decodeRLE({counts, size}, (x, y) => {
    xMin = Math.min(x, xMin);
    xMax = Math.max(x, xMax);
    yMin = Math.min(y, yMin);
    yMax = Math.max(y, yMax);
  });

  if (xMin < 0 || yMin < 0) {
    // empty mask
    return undefined;
  }

  // find the mask within the bounding box
  const {width, height} = size;
  const [w, h] = [xMax - xMin + 1, yMax - yMin + 1];
  const newCounts = [...counts];
  let prev = 0;
  for (let i = 0; i < counts.length; i += 2 /* only background counts need to be updated */) {
    if (i === 0) {
      newCounts[i] -= xMin * height + yMin;
    } else if (i === counts.length - 1) {
      newCounts[i] -= (width - 1 - xMax) * height + (height - 1 - yMax);
    } else {
      prev += counts[i - 1];
      const i0 = Math.floor((prev - 1) / height);
      const i1 = Math.floor((prev + counts[i]) / height);
      newCounts[i] -= (i1 - i0) * (height - h);
    }
    prev += counts[i];
  }

  const compressed = compressCounts(newCounts);
  return {rle: {counts: compressed, size: {width: w, height: h}}, offset: {x: xMin, y: yMin}};
}

export function expand(
  rle: RunLengthEncoding,
  size: {width: number; height: number},
  offset: {x: number; y: number}
): RunLengthEncoding {
  const {
    counts,
    size: {width: mw, height: mh},
  } = rle;
  const {x, y} = offset;
  const [xMin, xMax, yMin, yMax] = [x, x + mw - 1, y, y + mh - 1];
  const {width, height} = size;

  // Split counts of `1`s to fit the larger box.
  // For example, a filled 3x3 mask has counts [0, 9], which should be splitted to [0, 3, 0, 3, 0, 3] before being put
  // into a larger box.
  let total = 0;
  const oldCounts: number[] = [];
  counts.forEach((c, i) => {
    if (i % 2 === 0) {
      oldCounts.push(c);
      total += c;
      return;
    }
    while (c > 0) {
      const r = Math.min(c, mh - (total % mh));
      if (c > r) {
        oldCounts.push(r, 0);
      } else {
        oldCounts.push(r);
      }
      c -= r;
      total += r;
    }
  });

  const newCounts = [...oldCounts];
  let prev = 0;
  const tail = (width - 1 - xMax) * height + (height - 1 - yMax);
  for (let i = 0; i < oldCounts.length; i += 2 /* only background counts need to be updated */) {
    if (i === 0) {
      newCounts[i] += xMin * height + yMin;
    } else if (i === oldCounts.length - 1) {
      newCounts[i] += tail;
    } else {
      prev += oldCounts[i - 1];
      const i0 = Math.floor((prev - 1) / mh);
      const i1 = Math.floor((prev + oldCounts[i]) / mh);
      newCounts[i] += (i1 - i0) * (height - mh);
    }
    prev += oldCounts[i];
  }

  // potential tailing zeros
  if (tail > 0 && oldCounts.length % 2 === 0) {
    newCounts.push(tail);
  }

  const compressed = compressCounts(newCounts);
  return {counts: compressed, size: {width, height}};
}

export function compressCounts(counts: number[]) {
  const compressed: number[] = [];
  for (let i = 0, j = 0; i < counts.length; i++, j++) {
    if (j % 2 === 0) {
      compressed.push(counts[i]);
      continue;
    }
    let n = counts[i];
    while (i + 2 < counts.length && counts[i + 1] === 0) {
      n += counts[i + 2];
      i += 2;
    }
    compressed.push(n);
  }
  let n = compressed.length - 1;
  while (n >= 0 && compressed[n] === 0) {
    n--;
  }
  return compressed.slice(0, n + 1);
}
