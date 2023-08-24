import {ComponentAdapter, isAlmostIdenticalCoordinate} from './base';
import polylabel from 'polylabel';

import {ComponentDetail, Coordinates, PolychainComponent, Vertex} from '../../../../app/frontend/src/type/annotation';

export class Polychain extends ComponentAdapter {
  c: PolychainComponent;

  constructor(component: PolychainComponent) {
    super();
    this.c = component;
  }

  draw(canvas: Cypress.Chainable<JQuery<HTMLElement>>): void {
    cy.press(this.c.closed ? 'p' : 'l');
    this.c.vertices.forEach(({coordinates}, idx) => {
      const {x, y} = coordinates;
      if (idx === 0) {
        canvas.trigger('mousemove', x, y);
      }
      canvas.click(x, y);
    });
    cy.press('{enter}');
  }

  centroid(): Coordinates {
    const vs = this.c.vertices;
    if (this.c.closed) {
      const vs = this.c.vertices.map(({coordinates: {x, y}}) => [x, y]);
      const [x, y] = polylabel([vs]);
      return {x, y};
    }
    const i = Math.floor(vs.length / 2);
    return vs[i].coordinates;
  }

  frameTransform(fn: (p: Coordinates) => Coordinates): ComponentDetail {
    const vertices: Vertex[] = this.c.vertices.map(v => {
      const w: Vertex = {
        coordinates: fn(v.coordinates),
      };
      if (v.bezier) {
        w.bezier = {
          control1: fn(v.bezier.control1),
          control2: fn(v.bezier.control2),
        };
      }
      return w;
    });
    return {
      ...this.c,
      vertices,
    };
  }

  isAlmostIdentical(other: ComponentDetail): boolean {
    if (other.type !== 'polychain') return false;

    const {c} = this;
    if (c.closed !== other.closed) return false;
    if (c.vertices.length !== other.vertices.length) return false;
    for (let i = 0; i < c.vertices.length; i++) {
      const p = c.vertices[i];
      const q = other.vertices[i];
      if (!isAlmostIdenticalCoordinate(p.coordinates, q.coordinates)) return false;
      if (!!p.bezier !== !!q.bezier) return false;
      if (p.bezier && q.bezier) {
        if (!isAlmostIdenticalCoordinate(p.bezier.control1, q.bezier.control1)) return false;
        if (!isAlmostIdenticalCoordinate(p.bezier.control2, q.bezier.control2)) return false;
      }
    }

    return true;
  }
}
