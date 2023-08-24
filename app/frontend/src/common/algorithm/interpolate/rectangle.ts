import {Coordinates} from 'type/annotation';
import {linearInterpoation} from './util';

/**
 * Interpolate between two rectangles.
 * @param r1 The first rectangle.
 * @param r2 The second rectangle.
 * @param step The number of intermediate polylines to interpolate.
 * @returns A list of rectangles with length `step`.
 */
export function interpolateRectangle(
  r1: [Coordinates, Coordinates],
  r2: [Coordinates, Coordinates],
  step: number
): [Coordinates, Coordinates][] {
  const [p1, q1] = r1;
  const [p2, q2] = r2;

  const intermediates: [Coordinates, Coordinates][] = [];
  for (let i = 0; i < step; i++) {
    const r = (i + 1) / (step + 1);
    const p = linearInterpoation(p1, p2, r);
    const q = linearInterpoation(q1, q2, r);
    intermediates.push([p, q]);
  }

  return intermediates;
}
