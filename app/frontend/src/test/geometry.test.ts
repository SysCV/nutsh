import {coordinatesCanvasToImage, coordinatesImageToCanvas} from 'common/geometry';
import type {ViewportTransform} from 'state/annotate/render/viewport';
import type {Coordinates} from 'type/annotation';

describe('coordinate transformation', () => {
  test('between image and canvas', () => {
    const transform: ViewportTransform = {
      scale: 2,
      translation: [3, 4],
    };
    const p: Coordinates = {x: 5, y: 6};
    const q = coordinatesImageToCanvas(p, transform);
    expect(q).toStrictEqual({x: 13, y: 16});

    const p_ = coordinatesCanvasToImage(q, transform);
    expect(p_).toStrictEqual(p);
  });
});
