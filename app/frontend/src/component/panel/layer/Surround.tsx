import {FC, CanvasHTMLAttributes, useCallback} from 'react';

import {useStore as useAnnoStore} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';

import {useKeyPressed} from 'common/keyboard';
import {coordinatesCanvasToImage} from 'common/geometry';
import {SurroundStyle} from 'common/constant';
import {useCanvas} from 'common/hook';
import {useDrawRect} from 'common/render';

import type {Coordinates, EntityId} from 'type/annotation';
import {newComponentAdapter} from 'common/adapter';
import {Key} from 'ts-key-enum';

export const SurroundLayer: FC<CanvasHTMLAttributes<HTMLCanvasElement>> = ({...canvasProps}) => {
  const surround = useRenderStore(s => s.surround.data);
  const transform = useRenderStore(s => s.viewport.transform);
  const drawAnnoRect = useDrawRect(transform);
  const canvas = useCanvas(
    useCallback(
      ctx => {
        if (!surround) return;
        drawAnnoRect(ctx, surround.startPoint, surround.endPoint, SurroundStyle);
      },
      [drawAnnoRect, surround]
    )
  );

  const entities = useAnnoStore(s => s.annotation.entities);
  const data = useRenderStore(s => s.surround.data);
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const move = useRenderStore(s => s.surround.move);
  const finish = useRenderStore(s => s.surround.finish);

  const hasSelection = useRenderStore(s => s.select.ids.size > 0);
  const addSelection = useRenderStore(s => s.select.add);
  const setSelection = useRenderStore(s => s.select.set);

  // keybaord
  const isShiftPressed = useKeyPressed(Key.Shift);

  return (
    <canvas
      {...canvasProps}
      ref={canvas}
      onMouseMove={e => {
        if (!canvas.current) return;
        const {left, top} = canvas.current.getBoundingClientRect();
        const q = {x: e.clientX - left, y: e.clientY - top};
        const p = coordinatesCanvasToImage(q, transform);
        move(p);
      }}
      onMouseUp={() => {
        if (!data) return;
        const {startPoint: p, endPoint: q} = data;
        const x = Math.min(p.x, q.x);
        const y = Math.min(p.y, q.y);
        const w = Math.abs(p.x - q.x);
        const h = Math.abs(p.y - q.y);
        const box: Coordinates[] = [
          {x, y},
          {x: x + w, y},
          {x: x + w, y: y + h},
          {x, y: y + h},
        ];

        const hitIds: EntityId[] = [];
        for (const [, e] of Object.entries(entities)) {
          const slice = e.geometry.slices[sliceIndex] ?? {};
          for (const [, c] of Object.entries(slice)) {
            const adapter = newComponentAdapter(c);
            if (adapter.isWithin(box)) {
              hitIds.push(e.id);
            }
          }
        }
        if (hitIds.length > 0) {
          if (isShiftPressed && hasSelection) {
            addSelection(...hitIds);
          } else {
            setSelection(...hitIds);
          }
        }

        finish();
      }}
      onMouseLeave={finish}
    />
  );
};
