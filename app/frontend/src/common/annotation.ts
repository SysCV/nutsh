import {Annotation, Component, Entity, EntityId, SliceIndex, Vertex} from 'type/annotation';
import {deepClone} from './util';

export function addAnnotationComponent(
  a: Annotation,
  sliceIndex: SliceIndex,
  entityId: EntityId,
  component: Component
) {
  if (entityId in a.entities) {
    const slices = a.entities[entityId].geometry.slices;
    if (!(sliceIndex in slices)) {
      slices[sliceIndex] = {};
    }
    slices[sliceIndex][component.id] = deepClone(component);
  } else {
    a.entities[entityId] = {
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

export function setEntityCategory(
  e: Entity,
  category: string,
  entries: string[],
  sliceIndex: SliceIndex | undefined = undefined
) {
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
}

export function initialVertexBezier(vertexIndex: number, vertices: Vertex[]): NonNullable<Vertex['bezier']> {
  const n = vertices.length;
  const i = vertexIndex;
  const j = (vertexIndex + n - 1) % n;
  const {x: x1, y: y1} = vertices[i].coordinates;
  const {x: x2, y: y2} = vertices[j].coordinates;
  const [cx1, cy1] = [(x1 * 3) / 4 + (x2 * 1) / 4, (y1 * 3) / 4 + (y2 * 1) / 4];
  const [cx2, cy2] = [(x1 * 1) / 4 + (x2 * 3) / 4, (y1 * 1) / 4 + (y2 * 3) / 4];

  const dx = x2 - x1;
  const dy = y2 - y1;
  const l = Math.hypot(dx, dy);
  const d = l / 4;

  return {
    control1: {
      x: cx2 + (d * dy) / l,
      y: cy2 - (d * dx) / l,
    },
    control2: {
      x: cx1 - (d * dy) / l,
      y: cy1 + (d * dx) / l,
    },
  };
}
