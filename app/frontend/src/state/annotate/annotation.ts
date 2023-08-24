import create from 'zustand';
import {temporal} from 'zundo';
import {immer} from 'zustand/middleware/immer';
import {subscribeWithSelector} from 'zustand/middleware';

import {deepEqual, deepClone} from 'common/util';
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

export type State = {
  annotation: Annotation;
  setAnnotation: (annotation: Annotation | undefined) => void;

  setEntityCategory: (input: SetEntityCategoryInput) => void;
  clearEntityCategory: (input: ClearEntityCategoryInput) => void;
  deleteEntities: (input: DeleteEntitiesInput) => void;
  addComponent: (input: AddComponentInput) => void;
  addComponents: (input: AddComponentsInput) => void;
  transferComponent: (input: TransferComponentInput) => void;
  deleteComponents: (input: DeleteComponentsInput) => void;
  seperateComponent: (input: SeperateComponentInput) => void;
  updatePolychainVertices: (input: UpdatePolychainVerticesInput) => void;
  deletePolychainVertex: (input: DeletePolychainVertexInput) => void;
  setPolychainVertexBezier: (input: SetPolychainVertexBezierInput) => void;
  updateSliceMasks: (input: UpdateSliceMasksInput) => void;
  updateRectangleAnchors: (input: UpdateRectangleAnchorsInput) => void;
  paste: (input: PasteInput) => void;
  translate: (input: TranslateInput) => void;
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

export type SeperateComponentInput = {
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

export const useStore = create<State>()(
  temporal(
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

            if (sliceIndex !== undefined) {
              if (!e.sliceCategories) {
                e.sliceCategories = {};
              }
              if (!e.sliceCategories[sliceIndex]) {
                e.sliceCategories[sliceIndex] = {};
              }
              if (!e.sliceCategories[sliceIndex][category]) {
                e.sliceCategories[sliceIndex][category] = {};
              }
              e.sliceCategories[sliceIndex][category] = Object.fromEntries(entries.map(e => [e, true]));
            } else {
              if (!e.globalCategories) {
                e.globalCategories = {};
              }
              if (!e.globalCategories[category]) {
                e.globalCategories[category] = {};
              }
              e.globalCategories[category] = Object.fromEntries(entries.map(e => [e, true]));
            }
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

        seperateComponent: (input: SeperateComponentInput) => {
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

        deleteComponents: (input: DeleteComponentsInput) => {
          set(s => {
            const {sliceIndex, components} = input;

            components.forEach(([eid, cid]) => {
              deleteComponent(s, sliceIndex, eid, cid);
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

            const n = c.vertices.length;
            const i = vertexIndex;
            const j = (vertexIndex + n - 1) % n;
            const curr = c.vertices[i];
            if (isBezier) {
              const {x: x1, y: y1} = c.vertices[i].coordinates;
              const {x: x2, y: y2} = c.vertices[j].coordinates;
              const [cx1, cy1] = [(x1 * 3) / 4 + (x2 * 1) / 4, (y1 * 3) / 4 + (y2 * 1) / 4];
              const [cx2, cy2] = [(x1 * 1) / 4 + (x2 * 3) / 4, (y1 * 1) / 4 + (y2 * 3) / 4];

              const dx = x2 - x1;
              const dy = y2 - y1;
              const l = Math.hypot(dx, dy);
              const d = l / 4;

              curr.bezier = {
                control1: {
                  x: cx2 + (d * dy) / l,
                  y: cy2 - (d * dx) / l,
                },
                control2: {
                  x: cx1 - (d * dy) / l,
                  y: cy1 + (d * dx) / l,
                },
              };
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
    ),
    {
      partialize: state => {
        const {annotation} = state;
        return {annotation};
      },
      equality: (past, curr) => deepEqual(past, curr),
    }
  )
);

export const useTemporalStore = create(useStore.temporal);

function addComponent(s: State, sliceIndex: SliceIndex, entityId: EntityId, component: Component) {
  if (entityId in s.annotation.entities) {
    const slices = s.annotation.entities[entityId].geometry.slices;
    if (!(sliceIndex in slices)) {
      slices[sliceIndex] = {};
    }
    slices[sliceIndex][component.id] = deepClone(component);
  } else {
    s.annotation.entities[entityId] = {
      id: entityId,
      geometry: {
        slices: {
          [sliceIndex]: {
            [component.id]: deepClone(component),
          },
        },
      },
    };
  }
}

function deleteComponent(
  s: State,
  sliceIndex: SliceIndex,
  entityId: EntityId,
  componentId: ComponentId
): Component | undefined {
  const entity = s.annotation.entities[entityId];
  if (!entity) return;

  const slice = entity.geometry.slices[sliceIndex];
  if (!slice) return;

  const component = slice[componentId];
  delete slice[componentId];

  if (Object.keys(slice).length === 0) {
    delete entity.geometry.slices[sliceIndex];
  }
  if (Object.keys(entity.geometry.slices).length === 0) {
    delete s.annotation.entities[entityId];
  }

  return component;
}

export function getComponent(s: State, sidx: number, eid: EntityId, cid: ComponentId): Component | undefined {
  const slice = getSlice(s, sidx, eid);
  return slice?.[cid];
}

export function getSlice(s: State, sidx: number, eid: EntityId): ComponentMap | undefined {
  return s.annotation.entities[eid]?.geometry.slices[sidx];
}
