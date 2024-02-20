import * as Y from 'yjs';
import {MaskComponent} from 'type/annotation';

export type Mask = MaskComponent;

export function yjsMaskMap(doc: Y.Doc): Y.Map<Mask> {
  return doc.getMap<Mask>('amsk');
}
