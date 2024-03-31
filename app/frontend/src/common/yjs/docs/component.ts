import type {EntityId, SliceIndex} from '@@frontend/type/annotation';
import * as Y from 'yjs';

export type ComponentBase = {
  sidx: SliceIndex;
  eid: EntityId;
};

export type ComponentRectangle = ComponentBase & {
  type: 'rectangle';
};

export type ComponentPolychain = ComponentBase & {
  type: 'polychain';
  closed: boolean;
};

export type ComponentMask = ComponentBase & {
  type: 'mask';
};

export type Component = ComponentRectangle | ComponentPolychain | ComponentMask;

// The component map stores the *properties* of components, which is set at upon creation and can not change afterwards.
// Therefore, this map represents the existence of components, namely a component exists iff it is in this map.
// The key of the map is the component id.
export function yjsComponentMap(doc: Y.Doc): Y.Map<Component> {
  return doc.getMap<Component>('component');
}
