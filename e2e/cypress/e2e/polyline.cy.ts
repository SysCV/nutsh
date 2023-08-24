import {expectEntity, drawEntity, newPolyline, expectEntityCount, CanvasBorderY, waitReady} from './util';

describe('polyline', () => {
  describe('draw', () => {
    it('draw a simple line', () => {
      waitReady();

      const slices = [
        {
          sliceIndex: 0,
          components: [
            newPolyline([
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

    it('draw a line with two vertices', () => {
      waitReady();

      const slices = [
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [240, 120],
            ]),
          ],
        },
      ];
      drawEntity(slices);
      expectEntity(slices);
    });

    it('can not draw outside the image', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [240, 500],
            ]),
          ],
        },
      ]);
      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [240, CanvasBorderY],
            ]),
          ],
        },
      ]);
    });
  });

  describe('edit', () => {
    it('can not drag a vertex of a polyline outside the image', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [240, 240],
            ]),
          ],
        },
      ]);

      cy.get('#annotate-canvas').moveDrag(240, 240, 200, 500);

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [200, CanvasBorderY],
            ]),
          ],
        },
      ]);
    });
  });

  describe('vertex', () => {
    it('delete a vertex of a 3-vertex line', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
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

      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [300, 300],
            ]),
          ],
        },
      ]);
    });

    it('delete a vertex of a 2-vertex line to remove the component', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [300, 120],
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
            newPolyline([
              [100, 100],
              [300, 100],
              [300, 300],
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
            newPolyline({
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
              ],
            }),
          ],
        },
      ]);
    });

    it('can not turn the first vertex into bezier', () => {
      waitReady();

      const slices = [
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [100, 100],
              [300, 100],
              [300, 300],
            ]),
          ],
        },
      ];
      drawEntity(slices);

      const canvas = cy.get('#annotate-canvas');

      canvas.moveRightClick(100, 100);
      cy.contains('Turn to Bézier Vertex').click();

      // nothing should happen and the line should be untouched
      expectEntity(slices);
    });

    it('delete the first vertex will turn the second vertex into a normal one', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [120, 120],
              [300, 120],
              [300, 300],
            ]),
          ],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(300, 120);
      cy.contains('Turn to Bézier Vertex').click();
      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline({
              vertices: [
                {coordinates: {x: 120, y: 120}},
                {
                  coordinates: {x: 300, y: 120},
                  bezier: {
                    control1: {x: 165, y: 165},
                    control2: {x: 255, y: 75},
                  },
                },
                {coordinates: {x: 300, y: 300}},
              ],
            }),
          ],
        },
      ]);

      canvas.moveRightClick(120, 120);
      cy.contains('Delete Vertex').click();
      cy.contains('OK').click();
      expectEntity([
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [300, 120],
              [300, 300],
            ]),
          ],
        },
      ]);
    });
  });
});
