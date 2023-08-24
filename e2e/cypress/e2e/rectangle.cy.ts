import {CanvasBorderY, drawEntity, expectEntity, newRectangle, waitReady} from './util';

describe('rectangle', () => {
  describe('draw', () => {
    it('draw a rectangle', () => {
      waitReady();

      const slices = [
        {
          sliceIndex: 0,
          components: [newRectangle([120, 120, 240, 240])],
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
          components: [newRectangle([120, 120, 240, 500])],
        },
      ]);
      expectEntity([
        {
          sliceIndex: 0,
          components: [newRectangle([120, 120, 240, CanvasBorderY])],
        },
      ]);
    });
  });

  describe('edit', () => {
    it('drag vertices of a rectangle', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [newRectangle([120, 120, 240, 240])],
        },
      ]);

      cy.get('#annotate-canvas')
        .moveDrag(120, 120, 100, 100) // top left
        .moveDrag(240, 100, 360, 100) // top right
        .moveDrag(360, 240, 360, 360) // bottom right
        .moveDrag(100, 360, 50, 360); // bottom left

      expectEntity([
        {
          sliceIndex: 0,
          components: [newRectangle([50, 100, 360, 360])],
        },
      ]);
    });

    it('can not drag outside the image', () => {
      waitReady();

      drawEntity([
        {
          sliceIndex: 0,
          components: [newRectangle([120, 120, 240, 240])],
        },
      ]);

      cy.get('#annotate-canvas').moveDrag(240, 240, 200, 500);

      expectEntity([
        {
          sliceIndex: 0,
          components: [newRectangle([120, 120, 200, CanvasBorderY])],
        },
      ]);
    });
  });
});
