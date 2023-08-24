import type {Testing} from '../../../app/frontend/src/window';
import type {
  Annotation,
  ComponentDetail,
  EntityId,
  SliceIndex,
  Coordinates,
  PolychainComponent,
  RectangleComponent,
} from '../../../app/frontend/src/type/annotation';
import {newComponentAdapter} from './polymorphism';
import {isAlmostIdenticalCoordinate} from './polymorphism/base';

interface Slice {
  sliceIndex: SliceIndex;
  components: ComponentDetail[];
}

export function waitReady() {
  cy.visit('/app/_/video/test');
  cy.get('#annotation-container').should('be.visible');
}

export function expectEntity(canvasSlices: Slice[]) {
  // Unmet expectation inside a promise will NOT fail the test somehow, not sure if it is a bug or a feature.
  // To rescue, we use such `ok` flag.
  let ok = false;
  canvasToImage(canvasSlices)
    .then(({imageSlices, testing}) => {
      const {annoState} = testing;
      const anno: Annotation = annoState.annotation;

      // Use the first desc to find the entity which is expected to consist of
      // these components.
      const eid = findEntity(anno, imageSlices[0]);
      expect(eid).to.not.be.undefined;

      // Check slices match.
      const slices = anno.entities[eid!].geometry.slices;
      expect(Object.keys(slices)).to.has.lengthOf(imageSlices.length);
      imageSlices.forEach(({sliceIndex}) => expect(slices[sliceIndex]).to.not.be.undefined);

      // Check for each slice.
      imageSlices.forEach(({sliceIndex, components: wantComponents}) => {
        // Collect all components of this entity on the current frame.
        const actual = slices[sliceIndex];
        expect(Object.keys(actual)).to.has.lengthOf(wantComponents.length);

        // Find the one-to-one correspondence between the two set of components
        const cidToIdx = new Map<string, number>();
        wantComponents.forEach((c_, idx) => {
          const a_ = newComponentAdapter(c_).centroid();
          for (const [cid, c] of Object.entries(actual)) {
            const a = newComponentAdapter(c).centroid();
            if (isAlmostIdenticalCoordinate(a, a_)) {
              expect(cidToIdx.has(cid)).to.be.false;
              cidToIdx.set(cid, idx);
            }
          }
        });

        // Check components match.
        for (const [cid, c] of Object.entries(actual)) {
          const idx = cidToIdx.get(cid);
          expect(idx).to.be.not.undefined;

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const {id: _, ...got} = c;
          const want = wantComponents[idx!];

          // check
          const isAlmostIdentical = newComponentAdapter(got).isAlmostIdentical(want);
          expect(isAlmostIdentical).to.be.true;
        }
      });
    })
    .then(() => (ok = true))
    .catch(() => (ok = false));
  cy.wrap(null).should(() => expect(ok).to.be.true);
}

export function expectEntityCount(n: number) {
  let ok = false;
  cy.window()
    .its('testing')
    .then((testing: Testing) => {
      const {annoState} = testing;
      const anno: Annotation = annoState.annotation;
      const eids = Object.keys(anno.entities);
      expect(eids).to.have.lengthOf(n);

      // passed
      ok = true;
    });
  cy.wrap(null).should(() => expect(ok).to.be.true);
}

export function expectSelectionCount(n: number) {
  let ok = false;
  cy.window()
    .its('testing')
    .then((testing: Testing) => {
      const {
        renderState: {
          select: {ids},
        },
      } = testing;
      expect(ids.size).to.eq(n);

      // passed
      ok = true;
    });
  cy.wrap(null).should(() => expect(ok).to.be.true);
}

export function expectSelection(canvasSlices: Slice[]) {
  let ok = false;
  canvasToImage(canvasSlices).then(({imageSlices, testing}) => {
    const {
      renderState: {
        select: {ids},
      },
      annoState: {annotation: anno},
    } = testing;

    const eid = findEntity(anno, imageSlices[0]);
    expect(eid).to.not.be.undefined;
    expect(ids.has(eid)).to.be.true;

    // passed
    ok = true;
  });
  cy.wrap(null).should(() => expect(ok).to.be.true);
}

export function drawEntity(sliceDescs: Slice[]) {
  const canvas = cy.get('#annotate-canvas');

  sliceDescs.sort((a, b) => a.sliceIndex - b.sliceIndex);

  let sliceIndex = 0;
  sliceDescs.forEach((desc, sidx) => {
    while (sliceIndex < desc.sliceIndex) {
      cy.press('{rightArrow}');
      sliceIndex++;
    }
    desc.components.forEach((c, cidx) => {
      const adapter = newComponentAdapter(c);
      adapter.draw(canvas);

      // Select the entity for the first drawing.
      if (sidx === 0 && cidx === 0) {
        const {x, y} = adapter.centroid();
        canvas.moveClick(x, y);
      }
    });
  });

  // Deselect this entity.
  cy.press('{esc}');

  // Move the mouse away.
  canvas.trigger('mousemove', 0, 0);

  // Back to first frame.
  while (sliceIndex > 0) {
    cy.press('{leftArrow}');
    sliceIndex--;
  }
}

class FrameTransformer {
  dx: number;
  dy: number;
  r: number;

  constructor(dx: number, dy: number, r: number) {
    this.dx = dx;
    this.dy = dy;
    this.r = r;
  }

  canvasToImage(p: Coordinates): Coordinates {
    const {x, y} = p;
    return {
      x: (x - this.dx) / this.r,
      y: (y - this.dy) / this.r,
    };
  }
}

function canvasToImage(canvasSlices: Slice[]) {
  return new Cypress.Promise<{imageSlices: Slice[]; testing: Testing}>(resolve => {
    cy.window()
      .its('testing')
      .then((testing: Testing) => {
        const {renderState} = testing;
        const {sliceSize} = renderState;
        const {width: w1, height: h1} = sliceSize!;

        cy.get('#annotate-canvas').then(es => {
          const {width: w0, height: h0} = es[0].getBoundingClientRect();
          const r = Math.min(w0 / w1, h0 / h1);
          const dx = (w0 - w1 * r) / 2;
          const dy = (h0 - h1 * r) / 2;
          const trans = new FrameTransformer(dx, dy, r);

          // Convert coordinates of the input from canvas to image
          const imageSlices = canvasSlices.map(({sliceIndex, components}) => ({
            sliceIndex,
            components: components.map(c => {
              const adapter = newComponentAdapter(c);
              return adapter.frameTransform(p => trans.canvasToImage(p));
            }),
          }));

          resolve({imageSlices, testing});
        });
      });
  });
}

function findEntity(anno: Annotation, desc: Slice): EntityId | undefined {
  const {sliceIndex} = desc;
  const a_ = newComponentAdapter(desc.components[0]).centroid();
  for (const [eid, e] of Object.entries(anno.entities)) {
    const slice = e.geometry.slices[sliceIndex] ?? {};
    for (const [, c] of Object.entries(slice)) {
      const a = newComponentAdapter(c).centroid();
      if (isAlmostIdenticalCoordinate(a, a_)) {
        return eid;
      }
    }
  }
  return undefined;
}

export type PolychainInit = Omit<PolychainComponent, 'closed' | 'type'> | number[][];

export function newPolygon(c: PolychainInit): ComponentDetail {
  return newPolychain(c, true);
}

export function newPolyline(c: PolychainInit): ComponentDetail {
  return newPolychain(c, false);
}

export function newPolychain(c: PolychainInit, closed: boolean): ComponentDetail {
  if (Array.isArray(c)) {
    return {
      type: 'polychain' as const,
      closed,
      vertices: c.map(([x, y]) => ({coordinates: {x, y}})),
    };
  }
  return {
    ...c,
    type: 'polychain' as const,
    closed,
  };
}

export type RectangleInit = Omit<RectangleComponent, 'type'> | number[];

export function newRectangle(c: RectangleInit): ComponentDetail {
  if (Array.isArray(c)) {
    return {
      type: 'rectangle' as const,
      topLeft: {x: c[0], y: c[1]},
      bottomRight: {x: c[2], y: c[3]},
    };
  }
  return {
    ...c,
    type: 'rectangle' as const,
  };
}

// The `y` coordiante of the canvas corresponding to the largest `y` coordinate (720) of the testing image under the
// default transformation.
export const CanvasBorderY = 443.375;
