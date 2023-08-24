import {expectEntity, expectEntityCount, drawEntity, newPolygon, waitReady} from './util';

describe('history', () => {
  it('undo and redo', () => {
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
    cy.press('{meta}z');
    expectEntity([{sliceIndex: 0, components: [c1]}]);
    expectEntityCount(1);
    cy.press('{meta}z');
    expectEntityCount(0);

    cy.press('{meta}{shift}z');
    expectEntity([{sliceIndex: 0, components: [c1]}]);
    expectEntityCount(1);
    cy.press('{meta}{shift}z');
    expectEntity([{sliceIndex: 0, components: [c1]}]);
    expectEntity([{sliceIndex: 0, components: [c2]}]);
    expectEntityCount(2);
  });
});
