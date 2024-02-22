import {FC, useCallback, CanvasHTMLAttributes, useState} from 'react';
import shallow from 'zustand/shallow';

import {useAnnoStore} from 'state/annotate/annotation-provider';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useEditStore} from 'state/annotate/polychain/edit';

import {coordinatesCanvasToImage, limitCoordinates} from 'common/geometry';
import {useCanvas} from 'common/hook';

import {useDrawPolychain, useDrawDashedLine, useDrawVertex} from 'common/render';

import type {Data as EditData} from 'state/annotate/polychain/edit';
import {ColorPalette} from 'component/panel/entity/display';
import {editStyle} from 'common/constant';
import {useAnnoBroadcast} from 'state/annotate/annotation-broadcast';

const Canvas: FC<CanvasHTMLAttributes<HTMLCanvasElement> & {data: EditData}> = ({data, ...canvasProps}) => {
  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);

  const {vertexIdx, controlIdx, target} = data;
  const [vertices, setVertices] = useState(target.vertices);

  const transform = useRenderStore(s => s.viewport.transform);

  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const {entityId: eid, componentId: cid} = target;
  const closed = useAnnoStore(
    useCallback(
      ({annotation: a}) => {
        const c = a.entities[eid]?.geometry.slices[sliceIndex]?.[cid];
        if (c.type !== 'polychain') {
          return false;
        }
        return c.closed;
      },
      [eid, cid, sliceIndex]
    )
  );

  const drawPolychain = useDrawPolychain(transform);
  const drawDashedLine = useDrawDashedLine(transform);
  const drawAnnoVertex = useDrawVertex(transform);

  const canvas = useCanvas(
    useCallback(
      ctx => {
        const style = editStyle(ColorPalette.get(eid));
        drawPolychain(ctx, vertices, style, closed);

        // bezier
        const n = vertices.length;
        vertices.forEach((v, i) => {
          if (!v.bezier) {
            return;
          }
          const {control1, control2} = v.bezier;
          const end = v.coordinates;
          const start = vertices[(i + n - 1) % n].coordinates;

          drawDashedLine(ctx, start, control1, style);
          drawDashedLine(ctx, end, control2, style);
          drawAnnoVertex(ctx, {coordinates: control1}, style.vertex);
          drawAnnoVertex(ctx, {coordinates: control2}, style.vertex);
        });
      },
      [eid, vertices, closed, drawPolychain, drawDashedLine, drawAnnoVertex]
    )
  );

  const {updatePolychainVertices} = useAnnoBroadcast();
  const finishEdit = useEditStore(s => s.finish);
  const finish = useCallback(() => {
    updatePolychainVertices({sliceIndex, entityId: eid, componentId: cid, vertices});
    finishEdit();
  }, [cid, eid, finishEdit, sliceIndex, updatePolychainVertices, vertices]);

  return (
    <canvas
      {...canvasProps}
      ref={canvas}
      onMouseMove={e => {
        if (!canvas.current) return;
        const {left, top} = canvas.current.getBoundingClientRect();
        const q = {x: e.clientX - left, y: e.clientY - top};
        const p = coordinatesCanvasToImage(q, transform);

        const vs = [...vertices];
        if (controlIdx) {
          const {bezier: b} = vs[vertexIdx];
          if (!b) {
            console.warn('attempt to drag control vertex of a non-bezier vertex');
            return;
          }

          const bezier = {...b};
          if (controlIdx === 1) {
            bezier.control1 = p;
          } else {
            bezier.control2 = p;
          }
          vs[vertexIdx] = {...vs[vertexIdx], bezier};
        } else {
          vs[vertexIdx] = {...vs[vertexIdx], coordinates: limitCoordinates(p, imw, imh)};
        }

        setVertices([...vs]);
      }}
      onMouseUp={finish}
      onMouseLeave={finish}
    />
  );
};

export const Layer: FC<CanvasHTMLAttributes<HTMLCanvasElement>> = ({...canvasProps}) => {
  const data = useEditStore(s => s.data);
  return data ? <Canvas data={data} {...canvasProps} /> : null;
};
