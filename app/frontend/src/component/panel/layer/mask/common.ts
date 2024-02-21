import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {v4 as uuidv4} from 'uuid';
import shallow from 'zustand/shallow';
import {coordinatesImageToCanvas} from 'common/geometry';
import {ViewportTransform} from 'state/annotate/render/viewport';
import {useStore as useRenderStore} from 'state/annotate/render';
import {UpdateSliceMasksInput} from 'state/annotate/annotation';
import {ComponentId, EntityId, MaskComponent} from 'type/annotation';
import {editStyle} from 'common/constant';
import {ColorPalette} from 'component/panel/entity/display';
import {newComponentAdapter} from 'common/adapter';
import {encodeRLE} from 'common/algorithm/rle';
import {useVisibleEntities} from 'common/render';
import {useAnnoBroadcastStore} from 'state/annotate/annotation-broadcast';

// WARN(hxu): consider re-drawing only the updated part when running into performance issue.
export function updateImageRendering(
  renderCtx: CanvasRenderingContext2D,
  imageCtx: CanvasRenderingContext2D,
  transform: ViewportTransform,
  imageOffset?: [number, number]
) {
  console.debug('updateImageRendering');

  const {width: caw, height: cah} = renderCtx.canvas;
  renderCtx.clearRect(0, 0, caw, cah);

  const [dx, dy] = imageOffset ?? [0, 0];
  const {width: imw, height: imh} = imageCtx.canvas;
  const a = coordinatesImageToCanvas({x: 0 + dx, y: 0 + dy}, transform);
  const b = coordinatesImageToCanvas({x: imw + dx, y: imh + dy}, transform);
  renderCtx.drawImage(imageCtx.canvas, a.x, a.y, b.x - a.x, b.y - a.y);
}

type EntityComponentMask = [EntityId, ComponentId, MaskComponent];

export function useMaskedImageContext() {
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const visibleEntities = useVisibleEntities();
  const masks = useMemo(() => {
    const masks: EntityComponentMask[] = [];
    for (const [, e] of Object.entries(visibleEntities)) {
      const slice = e.geometry.slices[sliceIndex] ?? {};
      for (const [, c] of Object.entries(slice)) {
        if (c.type === 'mask') {
          masks.push([e.id, c.id, c]);
        }
      }
    }
    return masks;
  }, [sliceIndex, visibleEntities]);

  const init = useCallback((ctx: CanvasRenderingContext2D) => renderMask(ctx, masks), [masks]);
  const imageContext = useImageContext(init);

  return {imageContext, masks};
}

export function renderMask(ctx: CanvasRenderingContext2D, masks: EntityComponentMask[]) {
  masks.forEach(([eid, , m]) => {
    const ds = editStyle(ColorPalette.get(eid));
    const [r, g, b] = ds.fill;
    newComponentAdapter(m).render(ctx, {scale: 1.0, translation: [0, 0]}, {...ds, fill: [r, g, b, 255]});
  });
}

export function useCanvasContext(init?: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  useEffect(() => {
    if (!canvas.current) return;

    const ctx = canvas.current.getContext('2d');
    if (!ctx) return;

    init?.(ctx);
    setCtx(ctx);
  }, [init]);
  return {canvas, ctx};
}

export function useImageContext(init?: (ctx: CanvasRenderingContext2D) => void) {
  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);
  const imageContext = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = imw;
    canvas.height = imh;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    init?.(ctx);

    return ctx;
  }, [imh, imw, init]);

  // clean
  useEffect(() => () => imageContext.canvas.remove(), [imageContext.canvas]);

  return imageContext;
}

export function useUpdateMask(imageContext: CanvasRenderingContext2D, prevMasks: EntityComponentMask[]) {
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const updateSliceMasks = useAnnoBroadcastStore('updateSliceMasks');

  return useCallback(() => {
    const currMasks: EntityComponentMask[] = collectLocalMasks(imageContext).map(m => {
      const {x, y, w: width, h: height, entityId, mask} = m;
      const counts = encodeRLE(mask);
      const cid = uuidv4() as ComponentId;
      return [
        entityId,
        cid,
        {
          type: 'mask',
          rle: {counts, size: {width, height}},
          offset: {x, y},
        },
      ];
    });

    // compare diff to the initial ones
    const initial = new Map(prevMasks.map(m => [JSON.stringify([m[0], m[2]]), m]));
    const updated = new Map(currMasks.map(m => [JSON.stringify([m[0], m[2]]), m]));
    const removes: UpdateSliceMasksInput['removes'] = [];
    initial.forEach(([eid, cid], k) => {
      if (!updated.has(k)) {
        removes.push({entityId: eid, componentId: cid});
      }
    });
    const adds: UpdateSliceMasksInput['adds'] = [];
    updated.forEach(([eid, cid, c], k) => {
      if (!initial.has(k)) {
        adds.push({entityId: eid, component: {id: cid, ...c}});
      }
    });

    updateSliceMasks({sliceIndex, removes, adds});
  }, [imageContext, prevMasks, sliceIndex, updateSliceMasks]);
}

type Mask = {
  mask: Uint8Array;
  w: number;
  h: number;
};

type EntityLocalMask = Mask & {
  entityId: EntityId;
  x: number;
  y: number;
};

function collectLocalMasks(imageContext: CanvasRenderingContext2D): EntityLocalMask[] {
  const {width: imageWidth, height: imageHeight} = imageContext.canvas;
  const image = imageContext.getImageData(0, 0, imageWidth, imageHeight);

  function index(i: number, j: number): number {
    return j * imageWidth + i;
  }

  const visited = new Set<number /* index */>([]);
  function bfs(i0: number, j0: number, eid0: EntityId): [Mask, number, number] {
    visited.add(index(i0, j0));

    const queue = [[i0, j0]];
    let [minX, minY, maxX, maxY] = [i0, j0, i0 + 1, j0 + 1];
    for (let idx = 0; idx < queue.length; idx++) {
      const [i, j] = queue[idx];
      minX = Math.min(minX, i);
      minY = Math.min(minY, j);
      maxX = Math.max(maxX, i + 1);
      maxY = Math.max(maxY, j + 1);

      [
        [i + 1, j],
        [i - 1, j],
        [i, j + 1],
        [i, j - 1],
      ].forEach(([x, y]) => {
        if (x < 0 || x >= imageWidth || y < 0 || y >= imageHeight) {
          return;
        }

        const idx = index(x, y);
        if (visited.has(idx)) {
          return;
        }

        const [r, g, b] = rgbAt(idx, image);
        const eid = ColorPalette.lookup([r, g, b]);
        if (eid) {
          if (eid === eid0) {
            queue.push([x, y]);
            visited.add(idx);
          }
        } else if (r > 0 || g > 0 || b > 0) {
          // Using colors to reverse lookup labels may miss since canvas may draw slightly different colours due to
          // blending, say near the boundary of a circle. To rescue, for colourful pixel missing a valid label, we look
          // for its best nearby pixel which corresponds to a valid label.
          const p = bestNearbyValidPixel(x, y, image);
          if (p) {
            const [x2, y2] = p;
            const [r2, g2, b2] = rgbAt(index(x2, y2), image);
            const eid2 = ColorPalette.lookup([r2, g2, b2]);
            if (eid2 === eid0) {
              queue.push([x, y]);
              visited.add(idx);
            }
          } else {
            console.warn(`failed to find the best nearby valid pixel for pixel at (${i}, ${j})`);
          }
        }
      });
    }

    const [w, h] = [maxX - minX, maxY - minY];
    const mask = new Uint8Array(w * h);
    queue.forEach(([x, y]) => {
      // column-major
      const idx = (x - minX) * h + (y - minY);
      mask[idx] = 1;
    });

    return [{mask, w, h}, minX, minY];
  }

  const masks: EntityLocalMask[] = [];
  for (let j = 0; j < imageHeight; j++) {
    for (let i = 0; i < imageWidth; i++) {
      const idx = index(i, j);
      if (visited.has(idx)) {
        continue;
      }

      const [r, g, b] = rgbAt(idx, image);
      const entityId = ColorPalette.lookup([r, g, b]);
      if (!entityId) {
        continue;
      }

      // find a new component
      const [mask, x, y] = bfs(i, j, entityId);
      if (mask.w * mask.h <= 1) {
        console.warn(`ignored 1x1 mask at (${i}, ${j}) with RGB (${r},${g},${b})`);
        continue;
      }

      masks.push({...mask, entityId, x, y});
    }
  }

  return masks;
}

function bestNearbyValidPixel(i: number, j: number, image: ImageData): [number, number] | undefined {
  const {width, height} = image;
  const [r0, g0, b0] = rgbAt(j * width + i, image);

  let [x0, y0, d0] = [-1, -1, Number.MAX_VALUE];
  [
    [i + 1, j],
    [i - 1, j],
    [i, j + 1],
    [i, j - 1],
  ].forEach(([x, y]) => {
    if (x < 0 || x >= width || y < 0 || y >= height) {
      return;
    }

    const [r, g, b] = rgbAt(y * width + x, image);
    const l = ColorPalette.lookup([r, g, b]);
    if (l) {
      const d = Math.abs(r0 - r) + Math.abs(g0 - g) + Math.abs(b0 - b);
      if (d < d0) {
        d0 = d;
        x0 = x;
        y0 = y;
      }
    }
  });

  if (x0 < 0 || y0 < 0) {
    console.warn(`failed to find nearby valid pixel for (${i}, ${j})`);
    return undefined;
  }

  return [x0, y0];
}

function rgbAt(idx: number, image: ImageData): [number, number, number] {
  return [image.data[idx * 4], image.data[idx * 4 + 1], image.data[idx * 4 + 2]];
}
