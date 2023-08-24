import {ComponentDetail, Coordinates} from '../../../../app/frontend/src/type/annotation';

export const CoordinateTolerance = 0.5;

export abstract class ComponentAdapter {
  abstract draw(canvas: Cypress.Chainable<JQuery<HTMLElement>>): void;
  abstract centroid(): Coordinates;
  abstract frameTransform(fn: (p: Coordinates) => Coordinates): ComponentDetail;
  abstract isAlmostIdentical(other: ComponentDetail): boolean;
}

export function isAlmostIdenticalCoordinate(a: Coordinates, b: Coordinates): boolean {
  if (Math.abs(a.x - b.x) > 0.5) return false;
  if (Math.abs(a.y - b.y) > 0.5) return false;
  return true;
}
