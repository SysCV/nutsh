import {findVertexMapping} from 'common/algorithm/interpolate/polychain';

describe('interpolate', () => {
  test('find vertex mapping between two polylines with same amount of vertices', () => {
    const p1 = [
      [-5, 5],
      [5, 5],
      [5, -5],
    ].map(([x, y]) => ({x, y}));
    const p2 = [
      [-10, 10],
      [10, 10],
      [10, -10],
    ].map(([x, y]) => ({x, y}));

    const [mapping] = findVertexMapping(p1, p2);
    expect(mapping).toStrictEqual([0, 1, 2]);
  });

  test('find vertex mapping between two polylines with different amount of vertices', () => {
    // a triangle
    const [r1, a1] = [1, (Math.PI / 3) * 2];
    const p1 = [...new Array(3)].map((_, idx) => ({x: r1 * Math.cos(a1 * idx), y: r1 * Math.sin(a1 * idx)}));

    // a hexagon
    const [r2, a2] = [2, Math.PI / 3];
    const p2 = [...new Array(6)].map((_, idx) => ({x: r2 * Math.cos(a2 * idx), y: r2 * Math.sin(a2 * idx)}));

    const [mapping] = findVertexMapping(p1, p2);
    expect(mapping).toStrictEqual([0, 2, 4]);
  });
});
