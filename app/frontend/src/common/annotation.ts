import {Annotation, Component, Entity, EntityId, SliceIndex} from 'type/annotation';
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
