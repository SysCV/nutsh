import {CanvasHTMLAttributes, FC, useCallback, useState} from 'react';
import shallow from 'zustand/shallow';

import {useCanvas} from 'common/hook';
import {useDrawRect} from 'common/render';
import {editStyle} from 'common/constant';
import {coordinatesCanvasToImage, limitCoordinates} from 'common/geometry';

import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useEditStore, Data} from 'state/annotate/rectangle/edit';
import {ColorPalette} from 'component/panel/entity/display';
import {useAnnoStore} from 'state/annotate/annotation-provider';

const Canvas: FC<{data: Data} & CanvasHTMLAttributes<HTMLCanvasElement>> = ({data, ...canvasProps}) => {
  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);

  const {target, vertexIdx} = data;
  const {component: rect, entityId, componentId} = target;

  const [anchors, setAnchors] = useState({
    p: rect.topLeft,
    q: rect.bottomRight,
  });

  const transform = useRenderStore(s => s.viewport.transform);
  const drawRect = useDrawRect(transform);
  const canvas = useCanvas(
    useCallback(
      ctx => {
        const {p, q} = anchors;
        const style = editStyle(ColorPalette.get(entityId));
        drawRect(ctx, p, q, style);
      },
      [drawRect, anchors, entityId]
    )
  );

  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const updateAnchors = useAnnoStore(s => s.updateRectangleAnchors);
  const finishEdit = useEditStore(s => s.finish);
  const finish = useCallback(() => {
    const {p, q} = anchors;
    const x1 = Math.min(p.x, q.x);
    const y1 = Math.min(p.y, q.y);
    const x2 = Math.max(p.x, q.x);
    const y2 = Math.max(p.y, q.y);

    updateAnchors({sliceIndex, entityId, componentId, topLeft: {x: x1, y: y1}, bottomRight: {x: x2, y: y2}});
    finishEdit();
  }, [anchors, componentId, entityId, finishEdit, sliceIndex, updateAnchors]);

  return (
    <canvas
      ref={canvas}
      onMouseMove={e => {
        if (!canvas.current) return;
        const {left, top} = canvas.current.getBoundingClientRect();
        const mouseCanvas = {x: e.clientX - left, y: e.clientY - top};
        const {x, y} = limitCoordinates(coordinatesCanvasToImage(mouseCanvas, transform), imw, imh);

        const {p, q} = anchors;
        switch (vertexIdx) {
          case 0:
            setAnchors({p: {x, y}, q});
            break;
          case 1:
            setAnchors({p: {...p, y}, q: {...q, x}});
            break;
          case 2:
            setAnchors({p, q: {x, y}});
            break;
          case 3:
            setAnchors({p: {...p, x}, q: {...q, y}});
            break;
        }
      }}
      onMouseUp={finish}
      onMouseLeave={finish}
      {...canvasProps}
    />
  );
};

export const Layer: FC<CanvasHTMLAttributes<HTMLCanvasElement>> = ({...canvasProps}) => {
  const data = useEditStore(s => s.data);
  return data ? <Canvas data={data} {...canvasProps} /> : null;
};
