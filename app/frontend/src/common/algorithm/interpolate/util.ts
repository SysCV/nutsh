import {Coordinates} from 'type/annotation';

export function linearInterpoation(p1: Coordinates, p2: Coordinates, r: number): Coordinates {
  const {x: x1, y: y1} = p1;
  const {x: x2, y: y2} = p2;
  const [x, y] = [x1 + (x2 - x1) * r, y1 + (y2 - y1) * r];
  return {x, y};
}
