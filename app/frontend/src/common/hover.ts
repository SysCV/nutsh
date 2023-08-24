import {ComponentProximity} from 'state/annotate/render/mouse';
import {Annotate} from 'common/constant';
import type {Coordinates, EntityMap, SliceIndex} from 'type/annotation';
import type {ViewportTransform} from 'state/annotate/render/viewport';
import {newComponentAdapter} from './adapter';

export function detectHover(
  mouseImage: Coordinates,
  entities: EntityMap,
  sidx: SliceIndex,
  transform: ViewportTransform
): ComponentProximity | undefined {
  let spec: ComponentProximity | undefined = undefined;
  let min = -1;

  for (const [, e] of Object.entries(entities)) {
    const slice = e.geometry.slices[sidx] ?? {};
    for (const [, c] of Object.entries(slice)) {
      const adapter = newComponentAdapter(c);
      const detection = adapter.proximity(mouseImage);
      if (detection) {
        const {dist, info} = detection;
        const d = dist * transform.scale;
        if (min < 0 || d < min) {
          min = d;
          spec = {
            entityId: e.id,
            componentId: c.id,
            ...info,
          };
        }
      }
    }
  }
  if (spec && min <= Annotate.proximityThreshold) {
    return spec;
  }

  for (const [entityId, e] of Object.entries(entities)) {
    const slice = e.geometry.slices[sidx] ?? {};
    for (const [componentId, component] of Object.entries(slice)) {
      const adapter = newComponentAdapter(component);
      if (adapter.contain(mouseImage)) {
        return {
          entityId,
          componentId,
          vertexIdx: undefined,
          midpointIdx: undefined,
          controlIdx: undefined,
        };
      }
    }
  }

  return undefined;
}
