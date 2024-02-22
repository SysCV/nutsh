import * as Y from 'yjs';
import type {
  ComponentId,
  ComponentDetail,
  MaskComponent,
  PolychainComponent,
  RectangleComponent,
} from 'type/annotation';
import {newComponentAdapter} from 'common/adapter';
import {initialVertexBezier} from 'common/annotation';
import {
  AddComponentInput,
  AddComponentsInput,
  ClearEntityCategoryInput,
  DeleteComponentsInput,
  DeleteEntitiesInput,
  DeletePolychainVertexInput,
  PasteInput,
  SeparateComponentInput,
  SetEntityCategoryInput,
  SetPolychainVertexBezierInput,
  StateManipulation,
  TransferComponentInput,
  TranslateInput,
  TruncateEntitiesInput,
  UpdatePolychainVerticesInput,
  UpdateRectangleAnchorsInput,
  UpdateSliceMasksInput,
} from './annotation';
import {encodeEntityCategoryMapKey, yjsEntityCategoriesMap} from 'common/yjs/docs/entity';
import {useYjsContext} from 'common/yjs/context';
import {yjsComponentMap, Component as YjsComponent} from 'common/yjs/docs/component';
import {yjsRectangleAnchorsMap} from 'common/yjs/docs/rectangle';
import {yjsPolychainVerticesMap} from 'common/yjs/docs/polychain';
import {yjsMaskMap} from 'common/yjs/docs/mask';

export function useSetEntityCategory(): Pick<StateManipulation, 'setEntityCategory'> {
  const {doc} = useYjsContext();
  const cats = yjsEntityCategoriesMap(doc);

  const setEntityCategory = (input: SetEntityCategoryInput) => {
    const {sliceIndex: sidx, entityId: eid, category, entries} = input;
    const key = encodeEntityCategoryMapKey({eid, sidx, category});
    cats.set(key, entries);
  };

  return {setEntityCategory};
}

export function useClearEntityCategory(): Pick<StateManipulation, 'clearEntityCategory'> {
  const {doc} = useYjsContext();
  const cats = yjsEntityCategoriesMap(doc);

  const clearEntityCategory = (input: ClearEntityCategoryInput) => {
    const {sliceIndex: sidx, entityId: eid, category} = input;
    const key = encodeEntityCategoryMapKey({eid, sidx, category});
    cats.delete(key);
  };

  return {clearEntityCategory};
}

export function useSeparateComponent(): Pick<StateManipulation, 'separateComponent'> {
  const {doc} = useYjsContext();

  const comps = yjsComponentMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);
  const verts = yjsPolychainVerticesMap(doc);
  const masks = yjsMaskMap(doc);

  const separateComponent = (input: SeparateComponentInput) => {
    const {sliceIndex: sidx, entityId: eid, componentId: cid, newEntityId, newComponentId} = input;

    const comp = comps.get(cid);
    if (!comp) {
      console.warn(`component ${cid} not found`);
      return;
    }
    if (comp.eid !== eid || comp.sidx !== sidx) {
      console.warn(`expect component ${cid} be at [${eid}, ${sidx}] but got [${comp.eid}, ${comp.sidx}]`);
    }

    switch (comp.type) {
      case 'rectangle': {
        const as = anchors.get(cid);
        if (!as) {
          console.warn(`rectangle anchors for ${cid} not found`);
          return;
        }
        doc.transact(() => {
          comps.delete(cid);
          anchors.delete(cid);
          anchors.set(newComponentId, as);
          comps.set(newComponentId, {...comp, eid: newEntityId});
        });
        break;
      }
      case 'polychain': {
        const vs = verts.get(cid);
        if (!vs) {
          console.warn(`polychain vertices for ${cid} not found`);
          return;
        }
        doc.transact(() => {
          comps.delete(cid);
          verts.delete(cid);
          verts.set(newComponentId, vs.clone());
          comps.set(newComponentId, {...comp, eid: newEntityId});
        });
        break;
      }
      case 'mask': {
        const mask = masks.get(cid);
        if (!mask) {
          console.warn(`mask for ${cid} not found`);
          return;
        }
        doc.transact(() => {
          comps.delete(cid);
          masks.delete(cid);
          masks.set(newComponentId, mask);
          comps.set(newComponentId, {...comp, eid: newEntityId});
        });
        break;
      }
      default:
        console.error('unexpected input', input);
        break;
    }
  };

  return {separateComponent};
}

export function useAddComponent(): Pick<StateManipulation, 'addComponent'> {
  const {doc} = useYjsContext();

  const addComponent = (input: AddComponentInput) => {
    addComponentToDoc(doc, input);
  };

  return {addComponent};
}

export function useAddComponents(): Pick<StateManipulation, 'addComponents'> {
  const {doc} = useYjsContext();

  const addComponents = (input: AddComponentsInput) => {
    const {entityId, components} = input;
    doc.transact(() => {
      components.forEach(component => addComponentToDoc(doc, {entityId, ...component}));
    });
  };

  return {addComponents};
}

export function useUpdatePolychainVertices(): Pick<StateManipulation, 'updatePolychainVertices'> {
  const {doc} = useYjsContext();
  const verts = yjsPolychainVerticesMap(doc);

  const updatePolychainVertices = (input: UpdatePolychainVerticesInput) => {
    const {componentId: cid, vertices} = input;
    verts.set(cid, Y.Array.from(vertices));
  };

  return {updatePolychainVertices};
}

export function useTransferComponent(): Pick<StateManipulation, 'transferComponent'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);

  const transferComponent = (input: TransferComponentInput) => {
    const {sliceIndex: sidx, entityId: eid, componentId: cid, targetEntityId} = input;
    doc.transact(() => {
      const old = comps.get(cid);
      if (!old) {
        console.warn(`component ${cid} not found`);
        return;
      }
      if (old.eid !== eid || old.sidx !== sidx) {
        console.warn(`expect component ${cid} be at [${eid}, ${sidx}] but got [${old.eid}, ${old.sidx}]`);
        return;
      }
      old.eid = targetEntityId;
      comps.set(cid, old);
    });
  };

  return {transferComponent};
}

export function useDeleteEntities(): Pick<StateManipulation, 'deleteEntities'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);

  const deleteEntities = (input: DeleteEntitiesInput) => {
    const {entityIds} = input;
    const eids = new Set(entityIds);
    doc.transact(() => {
      const victims = new Map<ComponentId, YjsComponent>();
      for (const [cid, comp] of comps.entries()) {
        if (eids.has(comp.eid)) {
          victims.set(cid, comp);
        }
      }
      for (const [cid, comp] of victims.entries()) {
        deleteComponentFromDoc(doc, cid, comp.type);
      }
    });
  };

  return {deleteEntities};
}

export function useTruncateEntities(): Pick<StateManipulation, 'truncateEntities'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);

  const truncateEntities = (input: TruncateEntitiesInput) => {
    // TODO(xu): can be inefficient when there are too many components
    const {entityIds, sinceSliceIndex} = input;

    const cids: string[] = [];
    for (const [cid, comp] of comps.entries()) {
      if (!entityIds.includes(comp.eid)) {
        continue;
      }
      if (comp.sidx < sinceSliceIndex) {
        continue;
      }
      cids.push(cid);
    }

    doc.transact(() => {
      cids.forEach(cid => {
        const comp = comps.get(cid);
        if (!comp) {
          console.warn(`component ${cid} not found`);
          return;
        }
        deleteComponentFromDoc(doc, cid, comp.type);
      });
    });
  };

  return {truncateEntities};
}

export function useDeleteComponents(): Pick<StateManipulation, 'deleteComponents'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);

  const deleteComponents = (input: DeleteComponentsInput) => {
    const {components} = input;
    doc.transact(() => {
      components.forEach(([, cid]) => {
        const comp = comps.get(cid);
        if (!comp) {
          console.warn(`component ${cid} not found`);
          return;
        }
        deleteComponentFromDoc(doc, cid, comp.type);
      });
    });
  };

  return {deleteComponents};
}

export function useDeletePolychainVertex(): Pick<StateManipulation, 'deletePolychainVertex'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);
  const verts = yjsPolychainVerticesMap(doc);

  const deletePolychainVertex = (input: DeletePolychainVertexInput) => {
    const {componentId: cid, vertexIndex} = input;

    const comp = comps.get(cid);
    const vs = verts.get(cid);
    if (!vs || comp?.type !== 'polychain') {
      return;
    }
    const n = vs.length;
    if ((comp.closed && n <= 3) || (!comp.closed && n <= 2)) {
      deleteComponentFromDoc(doc, cid, comp.type);
      return;
    }

    doc.transact(() => {
      if (vertexIndex > 0 || comp.closed) {
        vs.delete(vertexIndex, 1);
      } else {
        // The first vertex of a polyline can NOT be bezier.
        if (vs.get(1).bezier) {
          const v = vs.get(1);
          vs.delete(1, 1);
          vs.insert(1, [{...v, bezier: undefined}]);
        }
        vs.delete(0, 1);
      }
    });
  };

  return {deletePolychainVertex};
}

export function useSetPolychainVertexBezier(): Pick<StateManipulation, 'setPolychainVertexBezier'> {
  const {doc} = useYjsContext();
  const verts = yjsPolychainVerticesMap(doc);

  const setPolychainVertexBezier = (input: SetPolychainVertexBezierInput) => {
    const {componentId: cid, vertexIndex, isBezier} = input;
    const vs = verts.get(cid);
    if (!vs) {
      console.warn(`polychain ${cid} vertices not found`);
      return;
    }

    const v = vs.get(vertexIndex);
    doc.transact(() => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- ok
      const {bezier: _, ...rest} = v;
      if (isBezier) {
        const bezier = initialVertexBezier(vertexIndex, vs.toArray());
        vs.delete(vertexIndex, 1);
        vs.insert(vertexIndex, [{...rest, bezier}]);
      } else {
        vs.delete(vertexIndex, 1);
        vs.insert(vertexIndex, [{...rest}]);
      }
    });
  };

  return {setPolychainVertexBezier};
}

export function useUpdateRectangleAnchors(): Pick<StateManipulation, 'updateRectangleAnchors'> {
  const {doc} = useYjsContext();
  const anchors = yjsRectangleAnchorsMap(doc);

  const updateRectangleAnchors = (input: UpdateRectangleAnchorsInput) => {
    const {componentId, topLeft, bottomRight} = input;
    anchors.set(componentId, {topLeft, bottomRight});
  };

  return {updateRectangleAnchors};
}

export function useUpdateSliceMasks(): Pick<StateManipulation, 'updateSliceMasks'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);
  const masks = yjsMaskMap(doc);

  const updateSliceMasks = (input: UpdateSliceMasksInput) => {
    const {sliceIndex: sidx, removes, adds} = input;
    doc.transact(() => {
      adds.forEach(({entityId: eid, component: c}) => {
        masks.set(c.id, c);
        comps.set(c.id, {type: 'mask', sidx, eid});
      });
      removes.forEach(({componentId: cid}) => {
        deleteComponentFromDoc(doc, cid, 'mask');
      });
    });
  };

  return {updateSliceMasks};
}

export function usePaste(): Pick<StateManipulation, 'paste'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);
  const verts = yjsPolychainVerticesMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);
  const masks = yjsMaskMap(doc);

  const paste = (input: PasteInput) => {
    const {entityComponents: ecs, sourceSliceIndex: sidx0, targetSliceIndex: sidx1} = input;
    doc.transact(() => {
      ecs.forEach(({entityId: eid, componentId: cid0, newComponentId: cid1}) => {
        const comp = comps.get(cid0);
        if (!comp) {
          console.warn('component not found', cid0);
          return;
        }
        if (comp.eid !== eid || comp.sidx !== sidx0) {
          console.warn(`expect component ${cid0} be at [${eid}, ${sidx0}] but got [${comp.eid}, ${comp.sidx}]`);
          return;
        }

        switch (comp.type) {
          case 'mask': {
            const c = masks.get(cid0);
            if (!c) {
              console.warn('mask not found', cid0);
              return;
            }
            addComponentToDoc(doc, {sliceIndex: sidx1, entityId: eid, component: {...c, id: cid1}});
            break;
          }
          case 'polychain': {
            const vs = verts.get(cid0);
            if (!vs) {
              console.warn('polychain not found', cid0);
              return;
            }
            const c: ComponentDetail = {type: 'polychain', vertices: vs.toArray(), closed: comp.closed};
            addComponentToDoc(doc, {sliceIndex: sidx1, entityId: eid, component: {...c, id: cid1}});
            break;
          }
          case 'rectangle': {
            const as = anchors.get(cid0);
            if (!as) {
              console.warn('rectangle not found', cid0);
              return;
            }
            const c: ComponentDetail = {type: 'rectangle', ...as};
            addComponentToDoc(doc, {sliceIndex: sidx1, entityId: eid, component: {...c, id: cid1}});
            break;
          }
          default:
            console.error('unexpected input', input);
            break;
        }
      });
    });
  };

  return {paste};
}

export function useTranslate(): Pick<StateManipulation, 'translate'> {
  const {doc} = useYjsContext();
  const comps = yjsComponentMap(doc);
  const verts = yjsPolychainVerticesMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);
  const masks = yjsMaskMap(doc);

  const translate = (input: TranslateInput) => {
    const {entityComponents: ecs, offsetX: dx, offsetY: dy} = input;

    ecs.forEach(({componentId: cid}) => {
      const comp = comps.get(cid);
      switch (comp?.type) {
        case 'mask': {
          const c = masks.get(cid);
          if (!c) {
            console.warn('mask not found', cid);
            return;
          }
          const adapter = newComponentAdapter(c);
          const translated = adapter.translate({x: dx, y: dy});
          masks.set(cid, translated as MaskComponent);
          break;
        }
        case 'polychain': {
          const vs = verts.get(cid);
          if (!vs) {
            console.warn('polychain not found', cid);
            return;
          }
          const adapter = newComponentAdapter({type: 'polychain', vertices: vs.toArray(), closed: comp.closed});
          const translated = adapter.translate({x: dx, y: dy});
          verts.set(cid, Y.Array.from((translated as PolychainComponent).vertices));
          break;
        }
        case 'rectangle': {
          const as = anchors.get(cid);
          if (!as) {
            console.warn('rectangle not found', cid);
            return;
          }
          const adapter = newComponentAdapter({type: 'rectangle', ...as});
          const translated = adapter.translate({x: dx, y: dy});
          anchors.set(cid, translated as RectangleComponent);
          break;
        }
        default:
          console.error('unexpected input', input);
          break;
      }
    });
  };

  return {translate};
}

function addComponentToDoc(doc: Y.Doc, input: AddComponentInput) {
  const comps = yjsComponentMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);
  const verts = yjsPolychainVerticesMap(doc);
  const masks = yjsMaskMap(doc);

  const {sliceIndex: sidx, entityId: eid, component} = input;
  switch (component.type) {
    case 'rectangle': {
      doc.transact(() => {
        const {id: cid, topLeft, bottomRight, type} = component;
        anchors.set(cid, {topLeft, bottomRight});
        comps.set(cid, {type, sidx, eid});
      });
      break;
    }
    case 'polychain': {
      const {id: cid, type, vertices, closed} = component;
      doc.transact(() => {
        verts.set(cid, Y.Array.from(vertices));
        comps.set(cid, {type, sidx, eid, closed});
      });
      break;
    }
    case 'mask': {
      const {id: cid, type} = component;
      doc.transact(() => {
        masks.set(cid, component);
        comps.set(cid, {type, sidx, eid});
      });
      break;
    }
    default:
      console.error('unexpected input', input);
      break;
  }
}

function deleteComponentFromDoc(doc: Y.Doc, cid: ComponentId, ctype: YjsComponent['type']) {
  const comps = yjsComponentMap(doc);
  const anchors = yjsRectangleAnchorsMap(doc);
  const verts = yjsPolychainVerticesMap(doc);
  const masks = yjsMaskMap(doc);

  comps.delete(cid);
  switch (ctype) {
    case 'rectangle':
      anchors.delete(cid);
      break;
    case 'polychain': {
      verts.delete(cid);
      break;
    }
    case 'mask': {
      masks.delete(cid);
      break;
    }
    default:
      console.error('unexpected component type', ctype);
      break;
  }
}
