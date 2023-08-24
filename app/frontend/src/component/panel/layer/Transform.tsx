import {FC, useState, useCallback, HTMLAttributes, useRef, useMemo} from 'react';
import shallow from 'zustand/shallow';

import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';
import {Annotate as AnnotateConstant} from 'common/constant';
import {distance, rectFitTransform, coordinatesCanvasToImage} from 'common/geometry';

import type {Coordinates} from 'type/annotation';
import {useHotkeys} from 'react-hotkeys-hook';

export const TransformLayer: FC<HTMLAttributes<HTMLDivElement> & {canvasSize: [number, number]}> = ({
  canvasSize: [cw, ch],
  ...divProps
}) => {
  const sliceSize = useRenderStore(s => s.sliceSize!, shallow);
  const container = useRef<HTMLDivElement>(null);

  const transform = useRenderStore(s => s.viewport.transform);
  const setTransform = useRenderStore(s => s.viewport.setTransform);

  const mouseClient = useUIStore(s => s.mouseClient);
  const mode = useUIStore(s => s.mode);

  // local
  const [mouseDownImage, setMouseDownImage] = useState<Coordinates | undefined>(undefined);
  const [mouseDownClient, setMouseDownClient] = useState<Coordinates | undefined>(undefined);

  // actions
  const reset = useCallback(() => {
    if (!container.current) return;
    const trans = rectFitTransform(sliceSize, container.current.getBoundingClientRect());
    setTransform(trans);
  }, [setTransform, sliceSize]);

  // keyboard
  useHotkeys('alt+r', reset);

  // local
  const [minScale, maxScale, dr] = useMemo(() => {
    const min = Math.min((cw * 0.8) / sliceSize.width, (ch * 0.8) / sliceSize.height);
    const max = AnnotateConstant.maxScale;
    const dr = (max - min) / 120;
    return [min, max, dr];
  }, [ch, cw, sliceSize.height, sliceSize.width]);

  const setScale = useCallback(
    (scale: number, anchor: Coordinates) => {
      if (!container.current) return;

      // Scale with anchor point at the mouse position if it is within the
      // image, otherwise the image center.
      const {width: w, height: h} = sliceSize;
      let {x: mx, y: my} = anchor;
      if (mx < 0 || mx >= w || my < 0 || my >= h) {
        mx = w / 2;
        my = h / 2;
      }
      const {
        scale: r,
        translation: [dx, dy],
      } = transform;
      const r2 = clamp(scale, minScale, maxScale);
      const dx2 = dx + (r - r2) * mx;
      const dy2 = dy + (r - r2) * my;
      setTransform({scale: r2, translation: [dx2, dy2]});
    },
    [container, sliceSize, transform, minScale, maxScale, setTransform]
  );
  const clear = useCallback(() => {
    setMouseDownImage(undefined);
    setMouseDownClient(undefined);
  }, []);

  return (
    <div
      ref={container}
      onMouseDown={e => {
        if (!container.current) return;
        if (e.button !== 0) return;

        const {left, top} = container.current.getBoundingClientRect();
        const q = {x: e.clientX - left, y: e.clientY - top};
        const p = coordinatesCanvasToImage(q, transform);
        setMouseDownImage(p);
        setMouseDownClient({x: e.clientX, y: e.clientY});
      }}
      onMouseMove={e => {
        if (mouseDownImage) {
          if (mode === 'zoom') {
            if (mouseClient && mouseDownClient) {
              const d = distance(mouseDownClient, {
                x: mouseClient[0],
                y: mouseClient[1],
              });
              const sign = Math.sign(e.clientY - mouseDownClient.y);
              const r0 = transform.scale + sign * d * 1e-3;
              const r = clamp(r0, minScale, maxScale);
              const anchor = mouseDownImage;
              setScale(r, anchor);
            }
          } else {
            if (!container.current) return;
            const {left, top} = container.current.getBoundingClientRect();
            const [cx, cy] = [e.clientX - left, e.clientY - top];
            const {x: mx, y: my} = mouseDownImage;
            const {scale: r} = transform;
            const [dx, dy] = [cx - mx * r, cy - my * r];
            setTransform({scale: r, translation: [dx, dy]});
          }
        }
      }}
      onMouseUp={clear}
      onMouseLeave={clear}
      onWheel={e => {
        if (!container.current || !mouseClient) return;
        const {left, top} = container.current.getBoundingClientRect();
        const [mx, my] = mouseClient;
        const q = {x: mx - left, y: my - top};
        const p = coordinatesCanvasToImage(q, transform);
        const r = transform.scale - dr * Math.sign(e.deltaY);
        setScale(r, p);
      }}
      {...divProps}
    />
  );
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(Math.min(v, max), min);
}
