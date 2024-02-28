import type {EntityId, SliceIndex} from '@@frontend/type/annotation';
import * as Y from 'yjs';

export type CategoryList = string[];

export interface EntityCategoryMapKey {
  category: string;
  eid: EntityId;
  sidx?: SliceIndex;
}

// entityId:categoty[:slice] -> entries
export function yjsEntityCategoriesMap(doc: Y.Doc): Y.Map<CategoryList> {
  return doc.getMap<CategoryList>('entityCategories');
}

export function encodeEntityCategoryMapKey({category, eid, sidx}: EntityCategoryMapKey): string {
  let key = `${eid}:${category}`;
  if (sidx !== undefined) {
    key += `:${sidx}`;
  }
  return key;
}

export function decodeEntityCategoryMapKey(key: string): EntityCategoryMapKey | undefined {
  const vs = key.split(':');
  if (vs.length === 2) {
    const [eid, category] = vs;
    return {category, eid};
  } else if (vs.length === 3) {
    const [eid, category, sliceStr] = vs;

    const sidx = parseInt(sliceStr);
    if (sidx >= 0) {
      return {category, eid, sidx};
    } else {
      return undefined;
    }
  }
  return undefined;
}
