import polylabel from 'polylabel';
import {deepClone} from 'common/util';
import {distance} from 'common/geometry';
import {Coordinates} from 'type/annotation';
import {linearInterpoation} from './util';

export type OriginalPoint = Coordinates & {
  id: string;
};

export type InterpolatedPoint = Coordinates & {
  src1: string;
  src2: string;
  r: number;
};

/**
 * Interpolate between two polygones.
 * @param p1 The first polygone.
 * @param p2 The second polygone.
 * @param step The number of intermediate polygones to interpolate.
 * @returns A list of polygones with length `step`.
 */
export function interpolatePolygone(p1: OriginalPoint[], p2: OriginalPoint[], step: number): InterpolatedPoint[][] {
  const [q1, q2, swapped] = p1.length <= p2.length ? [p1, p2, false] : [p2, p1, true];
  const [dx, dy] = polygoneInterpolateTranslation(q1, q2);
  const q2_ = q2.map(({x, y, ...rest}) => ({x: x + dx, y: y + dy, ...rest}));

  const r1 = deepClone(q2_);
  const r2 = deepClone(q2_).reverse();
  const {index: j1, diff: d1} = findPolygonBestInitialMapping(q1, r1);
  const {index: j2, diff: d2} = findPolygonBestInitialMapping(q1, r2);
  const [r, j] = d1 <= d2 ? [r1, j1] : [r2, j2];

  // construct the desied polylines
  const l1 = [...deepClone(q1), {...q1[0]}];
  const l2 = [...r.slice(j), ...r.slice(0, j), {...r[j]}];
  const intermediates = interpolateTransformedPolyline(l1, l2, step, [dx, dy]);
  if (swapped) {
    intermediates.reverse();
  }

  return intermediates.map(vertices => vertices.slice(0, -1));
}

/**
 * Interpolate between two polylines with the first and last vertices mapped.
 * @param p1 The first polyline.
 * @param p2 The second polyline.
 * @param step The number of intermediate polylines to interpolate.
 * @returns A list of polylines with length `step`.
 */
export function interpolatePolyline(p1: OriginalPoint[], p2: OriginalPoint[], step: number): InterpolatedPoint[][] {
  const [q1, q2, swapped] = p1.length <= p2.length ? [p1, p2, false] : [p2, p1, true];
  const [dx, dy] = polylineInterpolateTranslation(q1, q2);
  const q2_ = q2.map(({x, y, ...rest}) => ({x: x + dx, y: y + dy, ...rest}));

  const d1 = distance(q1[0], q2_[0]) + distance(q1[q1.length - 1], q2_[q2_.length - 1]);
  const d2 = distance(q1[0], q2_[q2_.length - 1]) + distance(q1[q1.length - 1], q2_[0]);
  const r = d1 <= d2 ? deepClone(q2_) : deepClone(q2_).reverse();

  const intermediates = interpolateTransformedPolyline(q1, r, step, [dx, dy]);
  if (swapped) {
    intermediates.reverse();
  }
  return intermediates;
}

/**
 * Interpolate between two polylines with the first and last vertices mapped. Appropriate translation should be applied
 * before calling this method. The length of `p1` must be no more than that of `p2`.
 * @param p1 The first polyline.
 * @param p2 The second polyline.
 * @param step The number of intermediate polylines to interpolate.
 * @param offset The offset `p2` has translated.
 * @returns A list of polylines with length `step`.
 */
export function interpolateTransformedPolyline(
  p1: OriginalPoint[],
  p2: OriginalPoint[],
  step: number,
  offset: [number, number]
): InterpolatedPoint[][] {
  // find vertex mapping without the first and last vertex
  const [m, n] = [p1.length, p2.length];
  console.assert(m >= 2 && n >= 2 && m <= n);
  const [mapping] = findVertexMapping(p1.slice(1, -1), p2.slice(1, -1));

  // put the first and last vertices back
  mapping.forEach((_, idx) => (mapping[idx] += 1));
  mapping.unshift(0);
  mapping.push(n - 1);

  // add new vertices in `p1` for those unmapped vertices in `p2` respecting the travelling distance
  const p1_: OriginalPoint[] = [];
  for (let i = 0; i < m; i++) {
    p1_.push(p1[i]);

    // add intermediate vertices if necessary
    if (i + 1 < m) {
      const j2 = mapping[i + 1];
      const j1 = mapping[i];
      if (j2 - j1 > 1) {
        let d2 = 0;
        for (let j = j1 + 1; j <= j2; j++) {
          d2 += distance(p2[j], p2[j - 1]);
        }

        let l2 = 0;
        for (let j = j1 + 1; j < j2; j++) {
          l2 += distance(p2[j], p2[j - 1]);
          const r = l2 / d2;
          const {x, y} = linearInterpoation(p1[i], p1[i + 1], r);
          p1_.push({x, y, id: ''});
        }
      }
    }
  }

  // interpolate from `p1_` to un-translated `p2` whose vertices are in one-to-one correspondence
  const [dx, dy] = offset;
  const intermediates: InterpolatedPoint[][] = [];
  for (let i = 0; i < step; i++) {
    intermediates.push(
      p1_.map(({x: x1, y: y1, id: src1}, idx) => {
        const {x: x2, y: y2, id: src2} = p2[idx];
        const r = (i + 1) / (step + 1);
        const {x, y} = linearInterpoation({x: x1, y: y1}, {x: x2 - dx, y: y2 - dy}, r);
        return {x, y, src1, src2, r};
      })
    );
  }

  return intermediates;
}

function findPolygonBestInitialMapping(p1: Coordinates[], p2: Coordinates[]): {index: number; diff: number} {
  const p2_ = deepClone(p2);
  const n = p2_.length;
  let j0 = 0;
  let [, d0] = findVertexMapping(p1.slice(1), p2_.slice(1));
  for (let j = 1; j < n; j++) {
    // rotate `p2_`
    p2_.push(p2_.shift()!);
    const [, d] = findVertexMapping(p1.slice(1), p2_.slice(1));
    if (d < d0) {
      j0 = j;
      d0 = d;
    }
  }
  return {index: j0, diff: d0};
}

/**
 * Determine the vertex correspondence between two polylines so that all vertices of `p1` are mapped to `p2` without
 * respecting the order. The length of `p1` must be no more than that of `p2`.
 * @param p1 The first polyline.
 * @param p2 The second polyline.
 * @returns A list of lenght `p1.length` whose `i`-th element tells the vertex index of `p2` to which the `i`-th index
 * of `p1` corresponds, and the total distance sum.
 */
export function findVertexMapping(p1: Coordinates[], p2: Coordinates[]): [number[], number] {
  const [m, n] = [p1.length, p2.length];
  console.assert(m <= n, 'the first polyline must have no more vertices than the second');

  const f: number[][] = [new Array(n).fill(0)];
  const g: number[][] = [new Array(n).fill(0)];
  for (let i = 1; i <= m; i++) {
    f.push(new Array(n).fill(0));
    g.push(new Array(n).fill(0));
    for (let j = i; j <= n; j++) {
      f[i][j] = f[i - 1][j - 1] + distance(p1[i - 1], p2[j - 1]);
      g[i][j] = j;
      for (let k = i; k < j; k++) {
        if (f[i][k] < f[i][j]) {
          f[i][j] = f[i][k];
          g[i][j] = g[i][k];
        }
      }
    }
  }

  const mapping: number[] = [];
  for (let i = 0; i < m; i++) {
    const idx = g[m - i][i === 0 ? n : mapping[i - 1]];
    mapping.push(idx - 1);
  }

  return [mapping.reverse(), f[m][n]];
}

function polylineInterpolateTranslation(p1: Coordinates[], p2: Coordinates[]): [number, number] {
  // find a translation of `p2` so that the squared sum of distances of the first and last vertices are minimised.
  const {x: x1, y: y1} = p1[0];
  const {x: x2, y: y2} = p1[p1.length - 1];
  const {x: x1_, y: y1_} = p2[0];
  const {x: x2_, y: y2_} = p2[p2.length - 1];
  return [(x1 - x1_ + x2 - x2_) / 2, (y1 - y1_ + y2 - y2_) / 2];
}

function polygoneInterpolateTranslation(p1: Coordinates[], p2: Coordinates[]): [number, number] {
  // Maybe the best choice is to minimise the Hausdorff distance between the two polygons, but let's not complicate
  // too much for now.
  // See https://mathoverflow.net/a/339637/41358
  const [x1, y1] = polylabel([p1.map(({x, y}) => [x, y])]);
  const [x2, y2] = polylabel([p2.map(({x, y}) => [x, y])]);
  return [x1 - x2, y1 - y2];
}
