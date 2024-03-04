import * as Y from 'yjs';
import type {
  Annotation,
  Component,
  ComponentId,
  EntityId,
  PolychainComponent,
  RectangleComponent,
  SliceIndex,
} from '@@frontend/type/annotation';
import {addAnnotationComponent, setEntityCategory} from '@@frontend/common/annotation';
import {yjsComponentMap, Component as YjsComponent} from './docs/component';
import {yjsRectangleAnchorsMap} from './docs/rectangle';
import {yjsPolychainVerticesMap} from './docs/polychain';
import {yjsMaskMap} from './docs/mask';
import {encodeEntityCategoryMapKey, decodeEntityCategoryMapKey, yjsEntityCategoriesMap} from './docs/entity';

export function readAnnotationFromYjs(doc: Y.Doc): Annotation {
  const anno: Annotation = {entities: {}};

  // components
  const comps = yjsComponentMap(doc);
  for (const cid of comps.keys()) {
    const info = comps.get(cid);
    if (!info) {
      continue;
    }
    const comp = readComponent(doc, cid, info);
    if (!comp) {
      continue;
    }
    const {sidx, eid} = info;
    addAnnotationComponent(anno, sidx, eid, comp);
  }

  // categories
  const cats = yjsEntityCategoriesMap(doc);
  for (const [key, entries] of cats.entries()) {
    const decoded = decodeEntityCategoryMapKey(key);
    if (!decoded) {
      console.warn('unexpected entity category key', key);
      continue;
    }
    const {eid, sidx, category} = decoded;
    const entity = anno.entities[eid];
    if (!entity) {
      console.warn('entity not found for category', key);
      cats.delete(key);
      continue;
    }
    setEntityCategory(entity, category, entries, sidx);
  }

  return anno;
}

export function writeAnnotationToYjs(anno: Annotation, doc: Y.Doc): void {
  Object.entries(anno.entities).forEach(([eid, entity]) => {
    Object.entries(entity.geometry.slices).forEach(([sidx, slice]) => {
      Object.values(slice).forEach(comp => {
        writeComponent(doc, comp, eid, parseInt(sidx));
      });
    });
    Object.entries(entity.globalCategories || {}).forEach(([cat, entries]) => {
      writeEntityCategory(doc, Object.keys(entries), cat, eid);
    });
    Object.entries(entity.sliceCategories || {}).forEach(([sidx, scats]) => {
      Object.entries(scats).forEach(([cat, entries]) => {
        writeEntityCategory(doc, Object.keys(entries), cat, eid, parseInt(sidx));
      });
    });
  });
  return;
}

export function readComponent(doc: Y.Doc, cid: ComponentId, info: YjsComponent): Component | undefined {
  const comps = yjsComponentMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);
  const verts = yjsPolychainVerticesMap(doc);
  const masks = yjsMaskMap(doc);

  switch (info.type) {
    case 'rectangle': {
      const rect = anchors.get(cid);
      if (!rect) {
        console.warn(`rectangle ${cid} not found`);
        comps.delete(cid);
        break;
      }
      const {topLeft, bottomRight} = rect;
      const comp: RectangleComponent = {type: 'rectangle', topLeft, bottomRight};
      return {...comp, id: cid};
    }
    case 'polychain': {
      const vs = verts.get(cid);
      if (!vs || vs.length === 0) {
        console.warn(`polychain ${cid} vertices not found or is empty`);
        comps.delete(cid);
        break;
      }
      const {closed} = info;
      const comp: PolychainComponent = {type: 'polychain', vertices: vs.toArray(), closed};
      return {...comp, id: cid};
    }
    case 'mask': {
      const mask = masks.get(cid);
      if (!mask) {
        console.warn(`mask ${cid} not found`);
        comps.delete(cid);
        break;
      }
      return {...mask, id: cid};
    }
    default:
      console.warn('unexpected');
  }
  return undefined;
}

function writeComponent(doc: Y.Doc, comp: Component, eid: EntityId, sidx: SliceIndex): void {
  const comps = yjsComponentMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);
  const verts = yjsPolychainVerticesMap(doc);
  const masks = yjsMaskMap(doc);

  switch (comp.type) {
    case 'mask':
      doc.transact(() => {
        const {id: cid, type, ...rest} = comp;
        masks.set(cid, {type, ...rest});
        comps.set(cid, {type, sidx, eid});
      });
      break;
    case 'polychain':
      doc.transact(() => {
        const {id: cid, type, vertices, closed} = comp;
        verts.set(cid, Y.Array.from(vertices));
        comps.set(cid, {type, sidx, eid, closed});
      });
      break;
    case 'rectangle':
      doc.transact(() => {
        const {id: cid, topLeft, bottomRight, type} = comp;
        anchors.set(cid, {topLeft, bottomRight});
        comps.set(cid, {type, sidx, eid});
      });
      break;
  }
}

function writeEntityCategory(doc: Y.Doc, entries: string[], category: string, eid: EntityId, sidx?: SliceIndex): void {
  const map = yjsEntityCategoriesMap(doc);
  const key = encodeEntityCategoryMapKey({category, eid, sidx});
  map.set(key, entries);
}
