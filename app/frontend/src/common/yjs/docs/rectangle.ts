import * as Y from 'yjs';
import {RectangleComponent} from 'type/annotation';

export type RectangleAnchors = Pick<RectangleComponent, 'topLeft' | 'bottomRight'>;

export function yjsRectangleAnchorsMap(doc: Y.Doc): Y.Map<RectangleAnchors> {
  return doc.getMap<RectangleAnchors>('rectangleAnchors');
}
