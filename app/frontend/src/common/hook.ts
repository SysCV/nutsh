import {useCallback, useRef, useEffect, useState, useMemo} from 'react';
import {v4 as uuidv4} from 'uuid';

import {deepEqual} from 'common/util';
import {EntityComponentId, useStore as useRenderStore} from 'state/annotate/render';
import {getComponent, getSlice} from 'state/annotate/annotation';
import {useAnnoStore} from 'state/annotate/annotation-provider';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useDrawPolyStore} from 'state/annotate/polychain/draw';
import {useStore as useDrawRectStore} from 'state/annotate/rectangle/draw';

import type {EntityId, Coordinates, ComponentId, Component, SliceIndex} from 'type/annotation';
import type {RectSize} from './geometry';
import {newComponentAdapter} from './adapter';

export function useInvertSelection() {
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const selectedIds = useRenderStore(s => s.select.ids);
  const setSelection = useRenderStore(s => s.select.set);

  const unselectedEntityIds = useAnnoStore(
    useCallback(
      s => {
        const entityIds: EntityId[] = [];
        for (const [, e] of Object.entries(s.annotation.entities)) {
          const slice = e.geometry.slices[sliceIndex] ?? {};
          if (Object.entries(slice).length === 0) {
            continue;
          }
          if (selectedIds.has(e.id)) {
            continue;
          }
          entityIds.push(e.id);
        }
        return entityIds;
      },
      [sliceIndex, selectedIds]
    )
  );

  return useCallback(() => setSelection(...unselectedEntityIds), [setSelection, unselectedEntityIds]);
}

export function useFocusAreas(canvasSize: RectSize) {
  const focusAreas = useRenderStore(s => s.viewport.focusAreas);
  const selectedIds = useRenderStore(s => s.select.ids);
  const sliceIndex = useRenderStore(s => s.sliceIndex);

  const selectedAreas = useAnnoStore(
    useCallback(
      s => {
        const closures: Coordinates[][] = [];
        selectedIds.forEach(eid => {
          const slice = getSlice(s, sliceIndex, eid);
          if (!slice) return;

          Object.values(slice).forEach(component => {
            const adapter = newComponentAdapter(component);
            closures.push(adapter.closure());
          });
        });
        return closures;
      },
      [sliceIndex, selectedIds]
    )
  );

  return useCallback(() => focusAreas(selectedAreas, canvasSize), [canvasSize, focusAreas, selectedAreas]);
}

export function useCanvas(draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvas.current) return;

    // plot
    const ctx = canvas.current.getContext('2d');
    if (!ctx) {
      throw new Error('failed to get context');
    }

    // clear
    const {width, height} = canvas.current.getBoundingClientRect();
    ctx.clearRect(0, 0, width, height);

    draw(ctx);
  }, [draw]);

  return canvas;
}

export function useSliceSelection(): {components: EntityComponentId[]; sliceIndex: SliceIndex} {
  const eids = useRenderStore(s => Array.from(s.select.ids));
  const sidx = useRenderStore(s => s.sliceIndex);
  const components = useAnnoStore(
    useCallback(
      s =>
        eids.map(eid => {
          const slice = getSlice(s, sidx, eid);
          return slice
            ? Object.keys(slice).map(cid => ({
                entityId: eid,
                componentId: cid,
              }))
            : [];
        }),
      [eids, sidx]
    )
  ).flat();
  return {components, sliceIndex: sidx};
}

export function useComponent(sidx: SliceIndex, eid: EntityId, cid: ComponentId): Component | undefined {
  return useAnnoStore(useCallback(s => getComponent(s, sidx, eid, cid), [sidx, eid, cid]));
}

// In React.StrictMode components will be rendered twice, thus naively calling `uuidv4()` twice will have some global
// unwanted side-effect such as advancing ColorPalette. Therefore, we carefully find the selected or new entity id.
export function useDrawingEntityId(): EntityId | undefined {
  const hasNext = useRef(false);
  const [next, setNext] = useState<EntityId | undefined>(undefined);
  useEffect(() => {
    if (hasNext.current) return;
    hasNext.current = true;
    setNext(uuidv4());
  }, []);
  const selectedEntityId = useRenderStore(s => s.select.ids.values().next().value);
  const entityId = useMemo(() => selectedEntityId ?? next, [selectedEntityId, next]);
  return entityId;
}

export function useEntityCategories(eid: EntityId, sidx: SliceIndex) {
  const sliceCategories = useAnnoStore(
    useCallback(s => s.annotation.entities[eid]?.sliceCategories?.[sidx] ?? {}, [eid, sidx]),
    deepEqual
  );
  const globalCategories = useAnnoStore(
    useCallback(s => s.annotation.entities[eid]?.globalCategories ?? {}, [eid]),
    deepEqual
  );
  const categories = useMemo(() => ({...globalCategories, ...sliceCategories}), [globalCategories, sliceCategories]);
  return categories;
}

export function useDrawing() {
  const isDrawingPoly = useDrawPolyStore(s => s.vertices.length > 0);
  const isDrawingRect = useDrawRectStore(s => !!s.points);
  const isDrawingMask = useUIStore(s => s.mode === 'mask');
  return {isDrawing: isDrawingPoly || isDrawingRect || isDrawingMask, isDrawingPoly, isDrawingRect, isDrawingMask};
}
