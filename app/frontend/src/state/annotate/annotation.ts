import {createStore} from 'zustand';
import {immer} from 'zustand/middleware/immer';
import {subscribeWithSelector} from 'zustand/middleware';

import {deepClone} from 'common/util';
import type {
  Annotation,
  Component,
  EntityId,
  ComponentId,
  SliceIndex,
  Vertex,
  Coordinates,
  ComponentMap,
} from 'type/annotation';
import {newComponentAdapter} from 'common/adapter';
import {addAnnotationComponent, initialVertexBezier, setEntityCategory} from 'common/annotation';

export type StateManipulation = {
  setEntityCategory: (input: SetEntityCategoryInput) => void;
  clearEntityCategory: (input: ClearEntityCategoryInput) => void;
  deleteEntities: (input: DeleteEntitiesInput) => void;
  truncateEntities: (input: TruncateEntitiesInput) => void;
  addComponent: (input: AddComponentInput) => void;
  addComponents: (input: AddComponentsInput) => void;
  transferComponent: (input: TransferComponentInput) => void;
  deleteComponents: (input: DeleteComponentsInput) => void;
  separateComponent: (input: SeparateComponentInput) => void;
  updatePolychainVertices: (input: UpdatePolychainVerticesInput) => void;
  deletePolychainVertex: (input: DeletePolychainVertexInput) => void;
  setPolychainVertexBezier: (input: SetPolychainVertexBezierInput) => void;
  updateSliceMasks: (input: UpdateSliceMasksInput) => void;
  updateRectangleAnchors: (input: UpdateRectangleAnchorsInput) => void;
  paste: (input: PasteInput) => void;
  translate: (input: TranslateInput) => void;
};

export type State = StateManipulation & {
  annotation: Annotation;
  setAnnotation: (annotation: Annotation | undefined) => void;

  /**
   * @deprecated It is relevant to sync-ing annotation to the backend, and will be deprecated after migrating to Yjs.
   */
  commitDraftComponents: () => void;
};

export type SetEntityCategoryInput = {
  sliceIndex?: SliceIndex;
  entityId: EntityId;
  category: string;
  entries: string[];
};

export type ClearEntityCategoryInput = {
  sliceIndex?: SliceIndex;
  entityId: EntityId;
  category: string;
};

export type DeleteEntitiesInput = {
  entityIds: EntityId[];
};

export type TruncateEntitiesInput = {
  sinceSliceIndex: SliceIndex;
  entityIds: EntityId[];
};

export type AddComponentInput = {
  sliceIndex: SliceIndex;
  entityId: EntityId;
  component: Component;
};

export type AddComponentsInput = {
  entityId: EntityId;
  components: {
    sliceIndex: SliceIndex;
    component: Component;
  }[];
};

export type TransferComponentInput = {
  sliceIndex: SliceIndex;
  entityId: EntityId;
  componentId: ComponentId;
  targetEntityId: EntityId;
};

export type DeleteComponentsInput = {
  sliceIndex: SliceIndex;
  components: [EntityId, ComponentId][];
};

export type SeparateComponentInput = {
  sliceIndex: SliceIndex;
  entityId: EntityId;
  componentId: ComponentId;
  newEntityId: EntityId;
  newComponentId: ComponentId;
};

export type UpdatePolychainVerticesInput = {
  sliceIndex: SliceIndex;
  entityId: EntityId;
  componentId: ComponentId;
  vertices: Vertex[];
};

export type DeletePolychainVertexInput = {
  sliceIndex: SliceIndex;
  entityId: EntityId;
  componentId: ComponentId;
  vertexIndex: number;
};

export type SetPolychainVertexBezierInput = {
  sliceIndex: SliceIndex;
  entityId: EntityId;
  componentId: ComponentId;
  vertexIndex: number;
  isBezier: boolean;
};

export type UpdateRectangleAnchorsInput = {
  sliceIndex: SliceIndex;
  entityId: EntityId;
  componentId: ComponentId;
  topLeft: Coordinates;
  bottomRight: Coordinates;
};

export type PasteInput = {
  entityComponents: {
    entityId: EntityId;
    componentId: ComponentId;
    newComponentId: ComponentId;
  }[];
  sourceSliceIndex: SliceIndex;
  targetSliceIndex: SliceIndex;
};

export type TranslateInput = {
  entityComponents: {
    entityId: EntityId;
    componentId: ComponentId;
  }[];
  sliceIndex: SliceIndex;
  offsetX: number;
  offsetY: number;
};

export type UpdateSliceMasksInput = {
  sliceIndex: SliceIndex;
  removes: {
    entityId: EntityId;
    componentId: ComponentId;
  }[];
  adds: {
    entityId: EntityId;
    component: Component & {type: 'mask'};
  }[];
};

const emptyAnnotation: Annotation = {entities: {}};

export function createAnnoStore() {
  return createStore<State>()(
    subscribeWithSelector(
      immer(set => ({
        annotation: emptyAnnotation,
        setAnnotation: (annotation: Annotation | undefined) => {
          set(s => {
            s.annotation = annotation ?? emptyAnnotation;
          });
        },

        setEntityCategory: (input: SetEntityCategoryInput) => {
          set(s => {
            const {sliceIndex, entityId, category, entries} = input;
            const e = s.annotation.entities[entityId];
            setEntityCategory(e, category, entries, sliceIndex);
          });
        },

        clearEntityCategory: (input: ClearEntityCategoryInput) => {
          set(s => {
            const {sliceIndex, entityId, category} = input;
            const e = s.annotation.entities[entityId];

            if (sliceIndex !== undefined) {
              const cats = e?.sliceCategories;
              const slice = cats?.[sliceIndex];
              delete slice?.[category];
              if (!!slice && Object.keys(slice).length === 0) {
                delete cats?.[sliceIndex];
              }
              if (!!cats && Object.keys(cats).length === 0) {
                delete e?.sliceCategories;
              }
            } else {
              const cats = e?.globalCategories;
              delete cats?.[category];
              if (!!cats && Object.keys(cats).length === 0) {
                delete e?.globalCategories;
              }
            }
          });
        },

        separateComponent: (input: SeparateComponentInput) => {
          set(s => {
            const {sliceIndex, entityId, componentId, newEntityId, newComponentId} = input;

            const c = deleteComponent(s, sliceIndex, entityId, componentId);
            if (!c) return;

            s.annotation.entities[newEntityId] = {
              id: newEntityId,
              geometry: {
                slices: {
                  [sliceIndex]: {
                    [newComponentId]: deepClone({
                      ...c,
                      id: newComponentId,
                    }),
                  },
                },
              },
            };
          });
        },

        addComponent: (input: AddComponentInput) => {
          set(s => {
            const {sliceIndex, entityId, component} = input;
            addComponent(s, sliceIndex, entityId, component);
          });
        },

        addComponents: (input: AddComponentsInput) => {
          set(s => {
            const {entityId, components} = input;
            components.forEach(({sliceIndex, component}) => addComponent(s, sliceIndex, entityId, component));
          });
        },

        updatePolychainVertices: (input: UpdatePolychainVerticesInput) => {
          set(s => {
            const {sliceIndex, entityId, componentId, vertices} = input;

            const slice = getSlice(s, sliceIndex, entityId);
            if (!slice) return;

            const old = slice[componentId];
            if (old?.type !== 'polychain') return;

            slice[componentId] = {...old, vertices};
          });
        },

        transferComponent: (input: TransferComponentInput) => {
          set(s => {
            const {sliceIndex, entityId, componentId, targetEntityId} = input;

            const c = deleteComponent(s, sliceIndex, entityId, componentId);
            if (!c) return;

            addComponent(s, sliceIndex, targetEntityId, c);
          });
        },

        deleteEntities: (input: DeleteEntitiesInput) => {
          set(s => {
            const {entityIds} = input;

            entityIds.forEach(eid => {
              delete s.annotation.entities[eid];
            });
          });
        },

        truncateEntities: (input: TruncateEntitiesInput) => {
          set(s => {
            const {entityIds, sinceSliceIndex} = input;

            entityIds.forEach(eid => {
              const slices = s.annotation.entities[eid].geometry.slices;
              const sidxs = Object.keys(slices).map(s => parseInt(s));
              for (const sidx of sidxs) {
                if (sidx >= sinceSliceIndex) {
                  delete slices[sidx];
                }
              }
            });
          });
        },

        deleteComponents: (input: DeleteComponentsInput) => {
          set(s => {
            const {sliceIndex, components} = input;

            components.forEach(([eid, cid]) => {
              deleteComponent(s, sliceIndex, eid, cid);
            });
          });
        },

        commitDraftComponents: () => {
          set(s => {
            Object.values(s.annotation.entities).forEach(entity => {
              Object.values(entity.geometry.slices).forEach(sliceComponents => {
                Object.values(sliceComponents).forEach(component => {
                  delete component.draft;
                });
              });
            });
          });
        },

        deletePolychainVertex: (input: DeletePolychainVertexInput) => {
          set(s => {
            const {sliceIndex, entityId, componentId, vertexIndex} = input;

            const c = getComponent(s, sliceIndex, entityId, componentId);
            if (c?.type !== 'polychain') return;

            const n = c.vertices.length;
            if ((c.closed && n <= 3) || (!c.closed && n <= 2)) {
              deleteComponent(s, sliceIndex, entityId, componentId);
            } else {
              c.vertices.splice(vertexIndex, 1);

              // The first vertex of a polyline can NOT be bezier.
              if (!c.closed && c.vertices[0].bezier) {
                c.vertices[0].bezier = undefined;
              }
            }
          });
        },

        setPolychainVertexBezier: (input: SetPolychainVertexBezierInput) => {
          set(s => {
            const {sliceIndex, entityId, componentId, vertexIndex, isBezier} = input;

            const c = getComponent(s, sliceIndex, entityId, componentId);
            if (c?.type !== 'polychain') return;

            const curr = c.vertices[vertexIndex];
            if (isBezier) {
              curr.bezier = initialVertexBezier(vertexIndex, c.vertices);
            } else {
              delete curr.bezier;
            }
          });
        },

        updateRectangleAnchors: (input: UpdateRectangleAnchorsInput) => {
          set(s => {
            const {sliceIndex, entityId, componentId, topLeft, bottomRight} = input;

            const slice = getSlice(s, sliceIndex, entityId);
            if (!slice) return;

            const old = slice[componentId];
            if (old?.type !== 'rectangle') return;

            slice[componentId] = {...old, topLeft, bottomRight};
          });
        },

        updateSliceMasks: (input: UpdateSliceMasksInput) => {
          set(s => {
            const {sliceIndex, removes, adds} = input;
            removes.forEach(({entityId: eid, componentId: cid}) => deleteComponent(s, sliceIndex, eid, cid));
            adds.forEach(({entityId: eid, component: c}) => addComponent(s, sliceIndex, eid, c));
          });
        },

        paste: (input: PasteInput) => {
          const {entityComponents: ecs, sourceSliceIndex: sidx0, targetSliceIndex: sidx1} = input;
          set(s => {
            ecs.forEach(({entityId: eid, componentId: cid0, newComponentId: cid1}) => {
              const c0 = getComponent(s, sidx0, eid, cid0);
              if (c0) {
                const c1 = deepClone({...c0, id: cid1});
                addComponent(s, sidx1, eid, c1);
              }
            });
          });
        },

        translate: (input: TranslateInput) => {
          const {entityComponents: ecs, offsetX: dx, offsetY: dy, sliceIndex: sidx} = input;
          set(s => {
            ecs.forEach(({entityId: eid, componentId: cid}) => {
              const c = getComponent(s, sidx, eid, cid);
              const slice = getSlice(s, sidx, eid);
              if (c && slice) {
                const adapter = newComponentAdapter(c);
                const translated = adapter.translate({x: dx, y: dy});
                slice[cid] = {id: cid, ...translated};
              }
            });
          });
        },
      }))
    )
  );
}

function addComponent(s: State, sliceIndex: SliceIndex, entityId: EntityId, component: Component) {
  addAnnotationComponent(s.annotation, sliceIndex, entityId, component);
}

function deleteComponent(
  s: State,
  sliceIndex: SliceIndex,
  entityId: EntityId,
  componentId: ComponentId
): Component | undefined {
  return deleteAnnotationComponent(s.annotation, sliceIndex, entityId, componentId);
}

export function getComponent(s: State, sidx: number, eid: EntityId, cid: ComponentId): Component | undefined {
  const slice = getSlice(s, sidx, eid);
  return slice?.[cid];
}

export function getSlice(s: State, sidx: number, eid: EntityId): ComponentMap | undefined {
  return s.annotation.entities[eid]?.geometry.slices[sidx];
}

export function deleteAnnotationComponent(
  annotation: Annotation,
  sliceIndex: SliceIndex,
  entityId: EntityId,
  componentId: ComponentId
): Component | undefined {
  const entity = annotation.entities[entityId];
  if (!entity) return;

  const slice = entity.geometry.slices[sliceIndex];
  if (!slice) return;

  const component = slice[componentId];
  delete slice[componentId];

  if (Object.keys(slice).length === 0) {
    delete entity.geometry.slices[sliceIndex];
  }
  if (Object.keys(entity.geometry.slices).length === 0) {
    delete annotation.entities[entityId];
  }

  return component;
}
