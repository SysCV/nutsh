import {expectEntity, drawEntity, newPolygon, expectEntityCount, CanvasBorderY, waitReady} from './util';

describe('polygon', () => {
  describe('draw', () => {
    it('draw a simple triangle', () => {
      waitReady();

      const slices = [
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [120, 120],
              [240, 120],
              [240, 240],
            ]),
          ],
        },
      ];
      drawEntity(slices);
      expectEntity(slices);
    });

    it('can not draw less than 3 vertices', () => {
      waitReady();

      cy.press('p');

      const canvas = cy.get('#annotate-canvas');
      canvas.moveClick(120, 120).moveClick(240, 240);
      cy.press('{enter}');
      expectEntityCount(0);
    });

    it('can not draw outside the image', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [120, 120],
              [240, 120],
              [240, 500],
            ]),
          ],
        },
      ]);
      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [120, 120],
              [240, 120],
              [240, CanvasBorderY],
            ]),
          ],
        },
      ]);
    });
  });

  describe('edit', () => {
    it('drag a vertex of a polygon', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [150, 150],
              [150, 200],
              [200, 200],
            ]),
          ],
        },
      ]);

      cy.get('#annotate-canvas').moveDrag(200, 200, 300, 300).moveDrag(150, 200, 150, 300);

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [150, 150],
              [150, 300],
              [300, 300],
            ]),
          ],
        },
      ]);
    });

    it('can not drag a vertex of a polygon outside the image', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [150, 150],
              [150, 200],
              [200, 200],
            ]),
          ],
        },
      ]);

      cy.get('#annotate-canvas').moveDrag(200, 200, 200, 500);

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [150, 150],
              [150, 200],
              [200, CanvasBorderY],
            ]),
          ],
        },
      ]);
    });

    it('click middle point to add a new vertex', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [100, 100],
              [300, 100],
              [300, 300],
            ]),
          ],
        },
      ]);

      cy.get('#annotate-canvas').moveDrag(200, 200, 100, 300);

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [100, 100],
              [300, 100],
              [300, 300],
              [100, 300],
            ]),
          ],
        },
      ]);
    });
  });

  describe('vertex', () => {
    it('delete a vertex', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [120, 120],
              [300, 120],
              [300, 300],
              [120, 300],
            ]),
          ],
        },
      ]);

      cy.get('#annotate-canvas').moveRightClick(120, 300);
      cy.contains('Delete Vertex').click();
      cy.contains('OK').click();

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [120, 120],
              [300, 120],
              [300, 300],
            ]),
          ],
        },
      ]);
    });

    it('delete a vertex of a triangle to remove the component', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [120, 120],
              [300, 120],
              [300, 300],
            ]),
          ],
        },
      ]);

      cy.get('#annotate-canvas').moveRightClick(300, 120);
      cy.contains('Delete Vertex').click();
      cy.contains('OK').click();

      expectEntityCount(0);
    });

    it('turn a normal vertex into a bezier one', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [100, 100],
              [300, 100],
              [300, 300],
              [100, 300],
            ]),
          ],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');

      canvas.moveRightClick(300, 300);
      cy.contains('Turn to Bézier Vertex').click();

      canvas
        .trigger('mousemove', 250, 150)
        .trigger('mousedown', 250, 150, {button: 0})
        .trigger('mousemove', 350, 150)
        .trigger('mouseup', 350, 150);

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon({
              vertices: [
                {coordinates: {x: 100, y: 100}},
                {coordinates: {x: 300, y: 100}},
                {
                  coordinates: {x: 300, y: 300},
                  bezier: {
                    control1: {x: 350, y: 150},
                    control2: {x: 350, y: 250},
                  },
                },
                {coordinates: {x: 100, y: 300}},
              ],
            }),
          ],
        },
      ]);
    });

    it('turn a bezier vertex into a normal one', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [100, 100],
              [300, 100],
              [300, 300],
              [100, 300],
            ]),
          ],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');

      canvas.moveRightClick(300, 300);
      cy.contains('Turn to Bézier Vertex').click();

      canvas.moveRightClick(300, 300);
      cy.contains('Turn to Normal Vertex').click();

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [100, 100],
              [300, 100],
              [300, 300],
              [100, 300],
            ]),
          ],
        },
      ]);
    });
  });

  describe('segment clone', () => {
    it('segment clone in the same order', () => {
      waitReady();

      const [n, ox, oy, r] = [24, 250, 250, 100];
      const coorFn = (idx: number): [number, number] => {
        const a = (2 * Math.PI * idx) / n;
        return [Math.round(ox + r * Math.cos(a)), Math.round(oy + r * Math.sin(a))];
      };

      const c = newPolygon(new Array(n).fill(0).map((_, i) => coorFn(i)));
      drawEntity([{sliceIndex: 0, components: [c]}]);

      const p0 = coorFn(0);
      const p1 = coorFn(1);
      const p2 = coorFn(12);

      const canvas = cy.get('#annotate-canvas');
      canvas
        .moveClick(350, 400)
        .trigger('keydown', {code: 'KeyQ', key: 'q'})
        .moveClick(p0[0], p0[1])
        .moveClick(p1[0], p1[1])
        .moveClick(p2[0], p2[1])
        .trigger('keyup', {code: 'KeyQ', key: 'q'})
        .moveClick(150, 400);
      cy.press('{enter}');

      expectEntity([
        {
          sliceIndex: 0,
          components: [newPolygon([[350, 400], ...new Array(13).fill(0).map((_, i) => coorFn(i)), [150, 400]])],
        },
      ]);
    });

    it('segment clone in the reverse order', () => {
      waitReady();

      const [n, ox, oy, r] = [24, 250, 250, 100];
      const coorFn = (idx: number): [number, number] => {
        const a = (2 * Math.PI * idx) / n;
        return [Math.round(ox + r * Math.cos(a)), Math.round(oy + r * Math.sin(a))];
      };

      const c = newPolygon(new Array(n).fill(0).map((_, i) => coorFn(i)));
      drawEntity([{sliceIndex: 0, components: [c]}]);

      const p0 = coorFn(12);
      const p1 = coorFn(11);
      const p2 = coorFn(0);

      const canvas = cy.get('#annotate-canvas');
      canvas
        .moveClick(150, 400)
        .trigger('keydown', {code: 'KeyQ', key: 'q'})
        .moveClick(p0[0], p0[1])
        .moveClick(p1[0], p1[1])
        .moveClick(p2[0], p2[1])
        .trigger('keyup', {code: 'KeyQ', key: 'q'})
        .moveClick(350, 400);
      cy.press('{enter}');

      expectEntity([
        {
          sliceIndex: 0,
          components: [newPolygon([[150, 400], ...new Array(13).fill(0).map((_, i) => coorFn(12 - i)), [350, 400]])],
        },
      ]);
    });

    it('segment clone change component on the way', () => {
      waitReady();

      const [n, r] = [12, 100];
      const coorFn = (ox: number, oy: number, idx: number): [number, number] => {
        const a = (2 * Math.PI * idx) / n;
        return [Math.round(ox + r * Math.cos(a)), Math.round(oy + r * Math.sin(a))];
      };

      const [ox1, oy1] = [250, 250];
      const [ox2, oy2] = [500, 250];
      const c1 = newPolygon(new Array(n).fill(0).map((_, i) => coorFn(ox1, oy1, i)));
      const c2 = newPolygon(new Array(n).fill(0).map((_, i) => coorFn(ox2, oy2, i)));
      drawEntity([{sliceIndex: 0, components: [c1]}]);
      drawEntity([{sliceIndex: 0, components: [c2]}]);

      const p0 = coorFn(ox1, oy1, 0);
      const p1 = coorFn(ox1, oy1, 1);
      const q0 = coorFn(ox2, oy2, 6);
      const q1 = coorFn(ox2, oy2, 5);
      const q2 = coorFn(ox2, oy2, 0);

      const canvas = cy.get('#annotate-canvas');
      canvas
        .moveClick(400, 400)
        .trigger('keydown', {code: 'KeyQ', key: 'q'})
        .moveClick(p0[0], p0[1])
        .moveClick(p1[0], p1[1])
        .moveClick(q0[0], q0[1])
        .moveClick(q1[0], q1[1])
        .moveClick(q2[0], q2[1])
        .trigger('keyup', {code: 'KeyQ', key: 'q'})
        .moveClick(600, 400);
      cy.press('{enter}');

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([[400, 400], ...new Array(7).fill(0).map((_, i) => coorFn(ox2, oy2, 6 - i)), [600, 400]]),
          ],
        },
      ]);
    });
  });

  describe('history', () => {
    it('undo and redo during drawing a polygon', () => {
      waitReady();
      cy.press('p');

      const canvas = cy.get('#annotate-canvas');
      canvas.moveClick(120, 120).moveClick(240, 120).moveClick(240, 240);
      cy.press('{meta}z');
      cy.press('{meta}z');
      canvas.moveClick(360, 120).moveClick(360, 360);
      cy.press('{meta}z');
      cy.press('{meta}z');
      cy.press('{meta}{shift}z');
      cy.press('{meta}{shift}z');
      cy.press('{enter}');
      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [120, 120],
              [360, 120],
              [360, 360],
            ]),
          ],
        },
      ]);
    });
  });
});
