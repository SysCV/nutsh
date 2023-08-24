import {drawEntity, expectEntity, newPolygon, newPolyline, newRectangle, waitReady} from './util';

describe('interpolation', () => {
  describe('polygon', () => {
    it('interpolate two polygons with same amount of vertices', () => {
      waitReady();

      // draw
      const p1 = [
        [100, 100],
        [150, 100],
        [150, 150],
        [100, 150],
      ];
      const p2 = [
        [300, 300],
        [400, 300],
        [400, 400],
        [300, 400],
      ];
      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolygon(p1)],
        },
        {
          sliceIndex: 9,
          components: [newPolygon(p2)],
        },
      ]);

      // interpolate
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(125, 125);
      cy.contains('Interpolate').click();
      for (let i = 0; i < 9; i++) cy.press('{rightArrow}');
      canvas.moveClick(350, 350);

      // check
      const intermediates = intermediatePoints(p1, p2, 10);
      expectEntity(
        [p1, ...intermediates, p2].map((p, idx) => ({
          sliceIndex: idx,
          components: [newPolygon(p)],
        }))
      );
    });

    it('interpolate two polygons with different amount of vertices', () => {
      waitReady();

      // draw
      const [x1, y1, r1, a1] = [150, 150, 50, (Math.PI * 2) / 3];
      const p1 = [...new Array(3)].map((_, i) => [
        // Cypress will turn coordinates into integers when passing to UI through mouse events, thus to avoid
        // inconsistency, make sure the coordinates are integers in the first place.
        Math.round(x1 + r1 * Math.cos(a1 * i)),
        Math.round(y1 + r1 * Math.sin(a1 * i)),
      ]);

      const [x2, y2, r2, a2] = [450, 250, 100, Math.PI / 6];
      const p2 = [...new Array(12)].map((_, i) => [
        Math.round(x2 + r2 * Math.cos(a2 * i)),
        Math.round(y2 + r2 * Math.sin(a2 * i)),
      ]);

      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolygon(p1)],
        },
        {
          sliceIndex: 9,
          components: [newPolygon(p2)],
        },
      ]);

      // interpolate
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(x1, y1);
      cy.contains('Interpolate').click();
      for (let i = 0; i < 9; i++) cy.press('{rightArrow}');
      canvas.moveClick(x2, y2);

      // check
      const intermediates = intermediatePoints(
        [
          p1[0],
          ...intermediatePoints([p1[0]], [p1[1]], 5).map(([p]) => p),
          p1[1],
          ...intermediatePoints([p1[1]], [p1[2]], 5).map(([p]) => p),
          p1[2],
          ...intermediatePoints([p1[2]], [p1[0]], 5).map(([p]) => p),
        ],
        p2,
        10
      );
      expectEntity(
        [p1, ...intermediates, p2].map((p, idx) => ({
          sliceIndex: idx,
          components: [newPolygon(p)],
        }))
      );
    });

    it('interpolate two polygons with opposite orientation', () => {
      waitReady();

      // draw
      const p1 = [
        [100, 100],
        [150, 100],
        [150, 150],
        [100, 150],
      ];
      const p2 = [
        [300, 300],
        [300, 400],
        [400, 400],
        [400, 300],
      ];
      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolygon(p1)],
        },
        {
          sliceIndex: 9,
          components: [newPolygon(p2)],
        },
      ]);

      // interpolate
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(125, 125);
      cy.contains('Interpolate').click();
      for (let i = 0; i < 9; i++) cy.press('{rightArrow}');
      canvas.moveClick(350, 350);

      // check
      const intermediates = intermediatePoints(
        p1,
        [
          [300, 300],
          [400, 300],
          [400, 400],
          [300, 400],
        ],
        10
      );
      expectEntity(
        [p1, ...intermediates, p2].map((p, idx) => ({
          sliceIndex: idx,
          components: [newPolygon(p)],
        }))
      );
    });

    it('bezier', () => {
      waitReady();

      const [x1, y1, x2, y2, d, n] = [100, 100, 300, 300, 10, 9];
      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [x1, y1],
              [x2, y1],
              [x2, y2],
              [x1, y2],
            ]),
          ],
        },
        {
          sliceIndex: n,
          components: [
            newPolygon([
              [x1 + d * n, y1 + d * n],
              [x2 + d * n, y1 + d * n],
              [x2 + d * n, y2 + d * n],
              [x1 + d * n, y2 + d * n],
            ]),
          ],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');

      canvas.moveRightClick(x2, y2);
      cy.contains('Turn to Bézier Vertex').click();
      canvas
        .trigger('mousemove', 250, 150)
        .trigger('mousedown', 250, 150, {button: 0})
        .trigger('mousemove', 350, 150)
        .trigger('mouseup', 350, 150);

      for (let i = 0; i < n; i++) cy.press('{rightArrow}');
      canvas.moveRightClick(x2 + d * n, y2 + d * n);
      cy.contains('Turn to Bézier Vertex').click();
      canvas
        .trigger('mousemove', 250 + d * n, 150 + d * n)
        .trigger('mousedown', 250 + d * n, 150 + d * n, {button: 0})
        .trigger('mousemove', 350 + d * n, 150 + d * n)
        .trigger('mouseup', 350 + d * n, 150 + d * n);

      // interpolate
      canvas.moveRightClick(x2 + d * n - 10, y2 + d * n - 10);
      cy.contains('Interpolate').click();
      for (let i = 8; i >= 0; i--) cy.press('{leftArrow}');
      canvas.moveClick(x2, y2);

      // check
      expectEntity(
        [...new Array(n + 1)].map((_, i) => ({
          sliceIndex: i,
          components: [
            newPolygon({
              vertices: [
                {coordinates: {x: x1 + i * d, y: y1 + i * d}},
                {coordinates: {x: x2 + i * d, y: y1 + i * d}},
                {
                  coordinates: {x: x2 + i * d, y: y2 + i * d},
                  bezier: {
                    control1: {x: 350 + d * i, y: 150 + d * i},
                    control2: {x: 350 + d * i, y: 250 + d * i},
                  },
                },
                {coordinates: {x: x1 + i * d, y: y2 + i * d}},
              ],
            }),
          ],
        }))
      );
    });
  });

  describe('polyline', () => {
    it('interpolate two polylines with same amount of vertices', () => {
      waitReady();

      // draw
      const p1 = [
        [100, 100],
        [150, 100],
        [150, 150],
        [200, 150],
      ];
      const p2 = [
        [250, 250],
        [300, 300],
        [350, 350],
        [400, 400],
      ];
      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolyline(p1)],
        },
        {
          sliceIndex: 9,
          components: [newPolyline(p2)],
        },
      ]);

      // interpolate
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(150, 150);
      cy.contains('Interpolate').click();
      for (let i = 0; i < 9; i++) cy.press('{rightArrow}');
      canvas.moveClick(400, 400);

      // check
      const intermediates = intermediatePoints(p1, p2, 10);
      expectEntity(
        [p1, ...intermediates, p2].map((p, idx) => ({
          sliceIndex: idx,
          components: [newPolyline(p)],
        }))
      );
    });

    it('interpolate two polylines with different amount of vertices', () => {
      waitReady();

      // draw
      const [x1, y1, d1, n1] = [100, 300, 50, 3];
      const p1 = [...new Array(n1)].map((_, i) => [x1, y1 + i * d1]);

      const [x2, y2, d2, n2] = [600, 100, 10, 9];
      const p2 = [...new Array(n2)].map((_, i) => [x2, y2 + i * d2]);

      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolyline(p1)],
        },
        {
          sliceIndex: 9,
          components: [newPolyline(p2)],
        },
      ]);

      // interpolate
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(x1, y1);
      cy.contains('Interpolate').click();
      for (let i = 0; i < 9; i++) cy.press('{rightArrow}');
      canvas.moveClick(x2, y2);

      // check
      const intermediates = intermediatePoints(
        [
          p1[0],
          ...intermediatePoints([p1[0]], [p1[1]], 5).map(([p]) => p),
          p1[1],
          ...intermediatePoints([p1[1]], [p1[2]], 5).map(([p]) => p),
          p1[2],
        ],
        p2,
        10
      );
      expectEntity(
        [p1, ...intermediates, p2].map((p, idx) => ({
          sliceIndex: idx,
          components: [newPolyline(p)],
        }))
      );
    });

    it('interpolate two polylines with opposite orientation', () => {
      waitReady();

      // draw
      const p1 = [
        [100, 300],
        [100, 350],
        [100, 400],
      ];
      const p2 = [
        [300, 120],
        [300, 110],
        [300, 100],
      ];
      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolyline(p1)],
        },
        {
          sliceIndex: 9,
          components: [newPolyline(p2)],
        },
      ]);

      // interpolate
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(100, 350);
      cy.contains('Interpolate').click();
      for (let i = 0; i < 9; i++) cy.press('{rightArrow}');
      canvas.moveClick(300, 110);

      // check
      const intermediates = intermediatePoints(
        p1,
        [
          [300, 100],
          [300, 110],
          [300, 120],
        ],
        10
      );
      expectEntity(
        [p1, ...intermediates, p2].map((p, idx) => ({
          sliceIndex: idx,
          components: [newPolyline(p)],
        }))
      );
    });
  });

  describe('rectangle', () => {
    it('interpolate two rectangles', () => {
      waitReady();

      // draw
      const p1 = [120, 120, 240, 240];
      const p2 = [300, 300, 400, 400];
      drawEntity([
        {
          sliceIndex: 0,
          components: [newRectangle(p1)],
        },
        {
          sliceIndex: 9,
          components: [newRectangle(p2)],
        },
      ]);

      // interpolate
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(180, 180);
      cy.contains('Interpolate').click();
      for (let i = 0; i < 9; i++) cy.press('{rightArrow}');
      canvas.moveClick(350, 350);

      // check
      const intermediates = intermediatePoints([p1], [p2], 10).map(([q]) => q);
      expectEntity(
        [p1, ...intermediates, p2].map((p, idx) => ({
          sliceIndex: idx,
          components: [newRectangle(p)],
        }))
      );
    });
  });
});

// Return an array of length `step - 2` being the list of all intermediate points linearly interpolated.
function intermediatePoints(p1: number[][], p2: number[][], step: number): number[][][] {
  return [...new Array(step - 2)].map((_, idx) => {
    const r = (idx + 1) / (step - 1);
    return p1.map((c1, i) => {
      return c1.map((c, j) => c * (1 - r) + p2[i][j] * r);
    });
  });
}
