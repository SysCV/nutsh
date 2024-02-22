import {useEffect} from 'react';
import * as Y from 'yjs';
import {useYjsContext} from './context';
import {Component as ComponentYjs, yjsComponentMap} from './docs/component';
import {useAnnoStore} from 'state/annotate/annotation-provider';
import {readComponent} from './convert';
import {RectangleAnchors, yjsRectangleAnchorsMap} from './docs/rectangle';
import {yjsPolychainVerticesMap} from './docs/polychain';
import {MaskComponent, Vertex} from 'type/annotation';
import {yjsMaskMap} from './docs/mask';
import {decodeEntityCategoryMapKey, yjsEntityCategoriesMap} from './docs/entity';

export function useYjsListener() {
  useComponentsListener();
  useRectangleAnchorsListener();
  usePolychainVerticesListener();
  useMasksListener();
  useEntityCategoriesListener();
}

function useComponentsListener() {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);

  const addComponent = useAnnoStore(s => s.addComponent);
  const deleteComponents = useAnnoStore(s => s.deleteComponents);
  const transferComponent = useAnnoStore(s => s.transferComponent);

  useEffect(() => {
    const fn = (e: Y.YMapEvent<ComponentYjs>) => {
      for (const [cid, cc] of e.changes.keys) {
        switch (cc.action) {
          case 'add': {
            const info = comps.get(cid);
            if (!info) {
              break;
            }

            // add component
            const {sidx, eid} = info;
            const component = readComponent(doc, cid, info);
            if (!component) {
              break;
            }
            addComponent({sliceIndex: sidx, entityId: eid, component});

            break;
          }
          case 'update': {
            // transferred component
            const comp = comps.get(cid);
            if (!comp) {
              return;
            }

            const {sliceIndex, entityId} = cc.oldValue;
            transferComponent({sliceIndex, entityId, componentId: cid, targetEntityId: comp.eid});
            break;
          }
          case 'delete': {
            // delete components
            const {sidx, eid} = cc.oldValue as ComponentYjs;
            deleteComponents({sliceIndex: sidx, components: [[eid, cid]]});
            break;
          }
        }
      }
    };
    comps.observe(fn);
    return () => comps.unobserve(fn);
  }, [addComponent, comps, deleteComponents, doc, transferComponent]);
}

function useRectangleAnchorsListener() {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);

  const updateAnchors = useAnnoStore(s => s.updateRectangleAnchors);

  useEffect(() => {
    const fn = (e: Y.YMapEvent<RectangleAnchors>) => {
      for (const cid of e.keysChanged) {
        const info = comps.get(cid);
        if (info) {
          const {sidx, eid} = info;
          const rect = anchors.get(cid);
          if (rect) {
            const {topLeft, bottomRight} = rect;
            updateAnchors({sliceIndex: sidx, entityId: eid, componentId: cid, topLeft, bottomRight});
          }
        } else {
          console.warn(`rectangle ${cid} not found`);
        }
      }
    };
    anchors.observe(fn);
    return () => anchors.unobserve(fn);
  }, [comps, anchors, updateAnchors]);
}

function usePolychainVerticesListener() {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);
  const verts = yjsPolychainVerticesMap(doc);

  const updateVertices = useAnnoStore(s => s.updatePolychainVertices);

  useEffect(() => {
    const fn = (e: Y.YMapEvent<Y.Array<Vertex>>) => {
      for (const cid of e.keysChanged) {
        const info = comps.get(cid);
        if (!info) {
          console.warn(`polychain ${cid} not found`);
          continue;
        }
        const vs = verts.get(cid);
        if (!vs) {
          console.warn(`polychain ${cid} vertices not found`);
          continue;
        }

        const {sidx, eid} = info;
        updateVertices({sliceIndex: sidx, entityId: eid, componentId: cid, vertices: vs.toArray()});
      }
    };
    verts.observe(fn);
    return () => verts.unobserve(fn);
  }, [comps, updateVertices, verts]);

  useEffect(() => {
    const fn = (es: Y.YEvent<Y.Array<Vertex>>[]) => {
      for (const e of es) {
        if (e.path.length !== 1) {
          continue;
        }
        const cid = `${e.path[0]}`;

        const info = comps.get(cid);
        if (!info) {
          console.warn(`polychain ${cid} not found`);
          continue;
        }
        const vs = verts.get(cid);
        if (!vs) {
          console.warn(`polychain ${cid} vertices not found`);
          continue;
        }
        const {sidx, eid} = info;
        updateVertices({sliceIndex: sidx, entityId: eid, componentId: cid, vertices: vs.toArray()});
      }
    };
    verts.observeDeep(fn);
    return () => verts.unobserveDeep(fn);
  }, [comps, updateVertices, verts]);
}

function useMasksListener() {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);
  const masks = yjsMaskMap(doc);

  const addComponent = useAnnoStore(s => s.addComponent);
  useEffect(() => {
    const fn = (e: Y.YMapEvent<MaskComponent>) => {
      for (const [cid, cc] of e.changes.keys) {
        switch (cc.action) {
          case 'add':
          case 'update': {
            const info = comps.get(cid);
            if (!info) {
              console.warn('mask info not found', cid);
              continue;
            }

            const mask = masks.get(cid);
            if (!mask) {
              console.warn('mask not found', cid);
              continue;
            }

            const {sidx, eid} = info;
            addComponent({sliceIndex: sidx, entityId: eid, component: {id: cid, ...mask}});
            break;
          }
          default:
            console.warn('not implemented', cc);
        }
      }
    };
    masks.observe(fn);
    return () => masks.unobserve(fn);
  }, [addComponent, comps, masks]);
}

function useEntityCategoriesListener() {
  const {doc} = useYjsContext();
  const cats = yjsEntityCategoriesMap(doc);

  const setEntityCategory = useAnnoStore(s => s.setEntityCategory);
  const clearEntityCategory = useAnnoStore(s => s.clearEntityCategory);

  useEffect(() => {
    const fn = (e: Y.YMapEvent<string[]>) => {
      for (const [key, cc] of e.changes.keys) {
        const decoded = decodeEntityCategoryMapKey(key);
        if (!decoded) {
          console.warn('unexpected entity category key', key);
          continue;
        }
        const {eid, sidx, category} = decoded;

        switch (cc.action) {
          case 'add':
          case 'update': {
            const entries = cats.get(key);
            if (!entries || entries.length === 0) {
              console.warn('missing category entries', key);
              continue;
            }
            setEntityCategory({entityId: eid, category, entries, sliceIndex: sidx});
            break;
          }
          case 'delete': {
            clearEntityCategory({entityId: eid, category, sliceIndex: sidx});
            break;
          }
        }
      }
    };
    cats.observe(fn);
    return () => cats.unobserve(fn);
  }, [cats, clearEntityCategory, setEntityCategory]);
}
