import * as Y from 'yjs';
import {Vertex} from 'type/annotation';

export type PolychainVertices = Y.Array<Vertex>;

export function yjsPolychainVerticesMap(doc: Y.Doc): Y.Map<PolychainVertices> {
  return doc.getMap<PolychainVertices>('polychainVertices');
}
