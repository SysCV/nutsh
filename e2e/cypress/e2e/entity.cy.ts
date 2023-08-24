import {newComponentAdapter} from './polymorphism';
import {
  expectEntity,
  expectEntityCount,
  drawEntity,
  newPolygon,
  newPolyline,
  newRectangle,
  expectSelectionCount,
  expectSelection,
  waitReady,
} from './util';

describe('entity', () => {
  describe('draw components', () => {
    it('draw two entities each with one component', () => {
      waitReady();

      const c1 = newPolygon([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ]);
      const c2 = newPolygon([
        [300, 300],
        [400, 300],
        [400, 400],
        [300, 400],
      ]);

      drawEntity([{sliceIndex: 0, components: [c1]}]);
      drawEntity([{sliceIndex: 0, components: [c2]}]);

      expectEntity([{sliceIndex: 0, components: [c1]}]);
      expectEntity([{sliceIndex: 0, components: [c2]}]);
    });

    it('draw one entity with two components', () => {
      waitReady();

      const slices = [
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [100, 100],
              [200, 100],
              [200, 200],
              [100, 200],
            ]),
            newPolygon([
              [300, 300],
              [400, 300],
              [400, 400],
              [300, 400],
            ]),
          ],
        },
      ];
      drawEntity(slices);
      expectEntity(slices);
    });

    it('draw an entity with multiple components across frames', () => {
      waitReady();

      const slices = [0, 1, 2].map(sliceIndex => ({
        sliceIndex,
        components: [
          newPolygon([
            [100, 100],
            [200, 100],
            [200, 200],
            [100, 200],
          ]),
        ],
      }));
      drawEntity(slices);
      expectEntity(slices);
    });
  });

  describe('delete', () => {
    it('various deletion of a complex entity', () => {
      waitReady();

      const c1 = newPolygon([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ]);
      const c2 = newPolygon([
        [300, 300],
        [400, 300],
        [400, 400],
        [300, 400],
      ]);

      drawEntity(
        [0, 1, 2].map(sliceIndex => ({
          sliceIndex,
          components: [c1, c2],
        }))
      );

      const canvas = cy.get('#annotate-canvas');

      // Delete a single polygon on the first frame.
      const a1 = newComponentAdapter(c1).centroid();
      cy.press('{leftArrow}').press('{leftArrow}');
      canvas.moveRightClick(a1.x, a1.y);
      cy.contains('Delete').click();
      cy.contains('OK').click();
      expectEntity([
        {sliceIndex: 0, components: [c2]},
        ...[1, 2].map(sliceIndex => ({sliceIndex, components: [c1, c2]})),
      ]);

      // Delete all polygons on the second frame.
      cy.press('{rightArrow}');
      canvas.moveRightClick(50, 50);
      cy.contains('Clear').click();
      cy.contains('OK').click();
      expectEntity([
        {sliceIndex: 0, components: [c2]},
        {sliceIndex: 2, components: [c1, c2]},
      ]);

      // Delete the entire entity on the third frame.
      cy.press('{rightArrow}');
      canvas.moveRightClick(50, 50);
      cy.contains('Purge').click();
      cy.contains('OK').click();
      expectEntityCount(0);
    });

    it('batch deletion', () => {
      waitReady();

      const c1 = newPolygon([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ]);
      const c2 = newPolygon([
        [300, 100],
        [400, 100],
        [400, 200],
        [300, 200],
      ]);
      const c3 = newPolygon([
        [500, 100],
        [600, 100],
        [600, 200],
        [500, 200],
      ]);
      drawEntity([
        {sliceIndex: 0, components: [c1, c2]},
        {sliceIndex: 1, components: [c3]},
      ]);
      drawEntity([{sliceIndex: 0, components: [c3]}]);

      const canvas = cy.get('#annotate-canvas');

      cy.holdModifier('{meta}', () => canvas.moveDrag(250, 400, 650, 50));

      canvas.moveRightClick(250, 400);
      cy.contains('Clear').click();
      cy.contains('OK').click();

      expectEntity([{sliceIndex: 1, components: [c3]}]);
    });
  });

  describe('manipulate components', () => {
    it('detach components', () => {
      waitReady();

      const c1 = newPolygon([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ]);
      const c2 = newPolygon([
        [300, 300],
        [400, 300],
        [400, 400],
        [300, 400],
      ]);

      drawEntity(
        [0].map(sliceIndex => ({
          sliceIndex,
          components: [c1, c2],
        }))
      );

      const a1 = newComponentAdapter(c1).centroid();
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(a1.x, a1.y);
      cy.contains('Detach').click();
      expectEntity([{sliceIndex: 0, components: [c1]}]);
      expectEntity([{sliceIndex: 0, components: [c2]}]);
    });

    it('transfer components', () => {
      waitReady();

      const c1 = newPolygon([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ]);
      const c2 = newPolygon([
        [300, 100],
        [400, 100],
        [400, 200],
        [300, 200],
      ]);
      const c3 = newPolygon([
        [500, 100],
        [600, 100],
        [600, 200],
        [500, 200],
      ]);

      drawEntity([{sliceIndex: 0, components: [c1, c2]}]);
      drawEntity([{sliceIndex: 0, components: [c3]}]);

      const a1 = newComponentAdapter(c1).centroid();
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(a1.x, a1.y);
      cy.contains('Transfer').click();
      const a3 = newComponentAdapter(c3).centroid();
      canvas.moveClick(a3.x, a3.y);
      expectEntity([{sliceIndex: 0, components: [c2]}]);
      expectEntity([{sliceIndex: 0, components: [c1, c3]}]);
    });

    it('transfer components across frames', () => {
      waitReady();

      const c1 = newPolygon([
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ]);
      const c2 = newPolygon([
        [300, 100],
        [400, 100],
        [400, 200],
        [300, 200],
      ]);
      const c3 = newPolygon([
        [500, 100],
        [600, 100],
        [600, 200],
        [500, 200],
      ]);

      drawEntity([{sliceIndex: 0, components: [c1, c2]}]);
      drawEntity([{sliceIndex: 2, components: [c3]}]);

      const a1 = newComponentAdapter(c1).centroid();
      const canvas = cy.get('#annotate-canvas');
      canvas.moveRightClick(a1.x, a1.y);
      cy.contains('Transfer').click();
      cy.press('{rightArrow}').press('{rightArrow}');
      const a3 = newComponentAdapter(c3).centroid();
      canvas.moveClick(a3.x, a3.y);
      expectEntity([{sliceIndex: 0, components: [c2]}]);
      expectEntity([
        {sliceIndex: 0, components: [c1]},
        {sliceIndex: 2, components: [c3]},
      ]);
    });
  });

  describe('select', () => {
    it('select, deselect and append', () => {
      waitReady();

      const polygon = [
        {
          sliceIndex: 0,
          components: [
            newPolygon([
              [100, 100],
              [150, 100],
              [200, 200],
              [125, 200],
              [100, 150],
            ]),
          ],
        },
      ];
      drawEntity(polygon);

      const polyline = [
        {
          sliceIndex: 0,
          components: [
            newPolyline([
              [200, 100],
              [250, 100],
              [300, 200],
              [225, 200],
              [200, 150],
            ]),
          ],
        },
      ];
      drawEntity(polyline);

      const rectangle = [
        {
          sliceIndex: 0,
          components: [newRectangle([300, 300, 350, 350])],
        },
      ];
      drawEntity(rectangle);

      const canvas = cy.get('#annotate-canvas');

      // select all
      cy.holdModifier('{meta}', () => canvas.moveDrag(10, 10, 400, 400));

      // deselect the polygon and the polyline
      cy.holdModifier('{meta}', () => canvas.moveClick(135, 150).moveClick(250, 100));

      // only the rectangle should be selected
      expectSelectionCount(1);
      expectSelection(rectangle);

      // select back the polygon
      cy.holdModifier('{meta}', () => canvas.moveClick(135, 150));

      // both the rectangle and the polygon should be selected
      expectSelectionCount(2);
      expectSelection(polygon);
      expectSelection(rectangle);

      // select back the polyline
      cy.holdModifier('{meta}', () => canvas.moveClick(250, 100));

      // all three should be selected
      expectSelectionCount(3);
      expectSelection(polygon);
      expectSelection(polyline);
      expectSelection(rectangle);

      cy.press('{esc}');

      // none should be selected
      expectSelectionCount(0);

      // drag-select the polygon
      cy.holdModifier('{meta}', () => canvas.moveDrag(10, 10, 210, 210));

      // only the polygon should be selected
      expectSelectionCount(1);
      expectSelection(polygon);

      // drag-select the rectangle
      cy.holdModifier('{meta}', () => canvas.moveDrag(290, 290, 360, 360));

      // only the rectangle should be selected
      expectSelectionCount(1);
      expectSelection(rectangle);

      // drag-append the polygon
      cy.holdModifier('{meta}{shift}', () => canvas.moveDrag(10, 10, 210, 210));

      // both the rectangle and the polygon should be selected
      expectSelectionCount(2);
      expectSelection(rectangle);
      expectSelection(polygon);
    });
  });

  describe('translate', () => {
    it('translate a polygon', () => {
      waitReady();

      const points = [
        [100, 100],
        [300, 100],
        [400, 200],
        [300, 300],
        [100, 300],
      ];
      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolygon(points)],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');
      canvas.moveDrag(200, 200, 300, 300);
      expectEntity([
        {
          sliceIndex: 0,
          components: [newPolygon(points.map(([x, y]) => [x + 100, y + 100]))],
        },
      ]);
    });

    it('translate a rectangle', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [newRectangle([100, 100, 200, 200])],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');
      canvas.moveDrag(150, 150, 250, 250);
      expectEntity([
        {
          sliceIndex: 0,
          components: [newRectangle([200, 200, 300, 300])],
        },
      ]);
    });

    it('translate a polyline', () => {
      waitReady();

      const points = [
        [100, 100],
        [300, 100],
        [400, 200],
        [300, 300],
        [100, 300],
      ];
      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolyline(points)],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');

      // polyline has to be dragged by selecting followed by a shift-dragging.
      canvas.moveClick(400, 200);
      cy.holdModifier('{shift}', () => canvas.moveDrag(150, 150, 250, 250));

      expectEntity([
        {
          sliceIndex: 0,
          components: [newPolyline(points.map(([x, y]) => [x + 100, y + 100]))],
        },
      ]);
    });

    it('translate multiple components', () => {
      waitReady();

      const polygon = [
        [100, 100],
        [150, 100],
        [200, 200],
        [250, 250],
        [100, 150],
      ];
      const rectangle = [300, 300, 350, 350];

      drawEntity([
        {
          sliceIndex: 0,
          components: [newPolygon(polygon)],
        },
      ]);
      drawEntity([
        {
          sliceIndex: 0,
          components: [newRectangle(rectangle)],
        },
      ]);

      const canvas = cy.get('#annotate-canvas');

      // select all
      cy.holdModifier('{meta}', () => canvas.moveDrag(50, 50, 500, 500));

      // drag with shift
      const d = 10;
      cy.holdModifier('{shift}', () => canvas.moveDrag(400, 400, 400 + d, 400 + d));

      expectEntity([
        {
          sliceIndex: 0,
          components: [newPolygon(polygon.map(([x, y]) => [x + d, y + d]))],
        },
      ]);
      expectEntity([
        {
          sliceIndex: 0,
          components: [newRectangle(rectangle.map(c => c + d))],
        },
      ]);
    });

    it('translate single component of a multi-component entity', () => {
      waitReady();

      const c1 = [
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ];
      const c2 = [
        [300, 300],
        [400, 300],
        [400, 400],
        [300, 400],
      ];
      const slices = [{sliceIndex: 0, components: [newPolygon(c1), newPolygon(c2)]}];
      drawEntity(slices);

      const [dx, dy] = [50, 50];
      const canvas = cy.get('#annotate-canvas');
      canvas.moveDrag(150, 150, 150 + dx, 150 + dy);
      expectEntity([{sliceIndex: 0, components: [newPolygon(c1.map(([x, y]) => [x + dx, y + dy])), newPolygon(c2)]}]);
    });
  });

  describe('copy-paste', () => {
    it('copy and paste', () => {
      waitReady();

      const c1 = [
        [100, 100],
        [200, 100],
        [200, 200],
        [100, 200],
      ];
      const slices = [{sliceIndex: 0, components: [newPolygon(c1)]}];
      drawEntity(slices);

      const canvas = cy.get('#annotate-canvas');
      canvas.moveClick(150, 150);
      cy.press('{meta}c').press('{rightArrow}').press('{meta}v').press('{rightArrow}').press('{meta}v');
      expectEntity([
        {sliceIndex: 0, components: [newPolygon(c1)]},
        {sliceIndex: 1, components: [newPolygon(c1)]},
        {sliceIndex: 2, components: [newPolygon(c1)]},
      ]);

      const [dx, dy] = [120, 120];
      canvas.moveDrag(150, 150, 150 + dx, 150 + dy);
      cy.wait(500);
      cy.press('{meta}v');
      expectEntity([
        {sliceIndex: 0, components: [newPolygon(c1)]},
        {sliceIndex: 1, components: [newPolygon(c1)]},
        {sliceIndex: 2, components: [newPolygon(c1), newPolygon(c1.map(([x, y]) => [x + dx, y + dy]))]},
      ]);
    });
  });
});
