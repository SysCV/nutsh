import {ComponentAdapter, isAlmostIdenticalCoordinate} from './base';

import {ComponentDetail, Coordinates, RectangleComponent} from '../../../../app/frontend/src/type/annotation';

export class Rectangle extends ComponentAdapter {
  c: RectangleComponent;

  constructor(component: RectangleComponent) {
    super();
    this.c = component;
  }

  draw(canvas: Cypress.Chainable<JQuery<HTMLElement>>): void {
    cy.press('a');
    const {topLeft: p, bottomRight: q} = this.c;

    canvas
      .trigger('mousemove', p.x, p.y)
      .trigger('mousedown', p.x, p.y, {button: 0})
      .trigger('mousemove', q.x, q.y)
      .trigger('mouseup', q.x, q.y);
  }

  centroid(): Coordinates {
    const {topLeft: p, bottomRight: q} = this.c;
    return {
      x: Math.round((p.x + q.x) / 2),
      y: Math.round((p.y + q.y) / 2),
    };
  }

  frameTransform(fn: (p: Coordinates) => Coordinates): ComponentDetail {
    return {
      ...this.c,
      topLeft: fn(this.c.topLeft),
      bottomRight: fn(this.c.bottomRight),
    };
  }

  isAlmostIdentical(other: ComponentDetail): boolean {
    if (other.type !== 'rectangle') return false;

    const {c} = this;
    if (!isAlmostIdenticalCoordinate(c.topLeft, other.topLeft)) return false;
    if (!isAlmostIdenticalCoordinate(c.bottomRight, other.bottomRight)) return false;

    return true;
  }
}
