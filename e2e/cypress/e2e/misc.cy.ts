import {expectEntityCount, drawEntity, newPolygon} from './util';

describe('miscellaneous', () => {
  it('can not draw when image is not loaded', () => {
    cy.intercept('GET', '/app/dev/video-frame-1.jpg', {statusCode: 404}).as('ImageNotFound');

    cy.visit('/app/_/video/test');
    cy.get('#slice-image').should('be.visible');

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

    expectEntityCount(0);
  });
});
