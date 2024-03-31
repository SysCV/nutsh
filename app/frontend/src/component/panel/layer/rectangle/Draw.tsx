import {FC, useCallback, HTMLAttributes} from 'react';
import intl from 'react-intl-universal';
import shallow from 'zustand/shallow';
import {v4 as uuidv4} from 'uuid';
import {useCanvas, useDrawingEntityId} from 'common/hook';
import {editStyle} from 'common/constant';
import {useDrawRect} from 'common/render';
import {coordinatesCanvasToImage, limitCoordinates} from 'common/geometry';

import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useDrawStore} from 'state/annotate/rectangle/draw';
import {ColorPalette} from 'component/panel/entity/display';
import {EntityId} from 'type/annotation';
import {useHotkeys} from 'react-hotkeys-hook';
import {Button, Space, Tag, Tooltip} from 'antd';
import {ClearOutlined} from '@ant-design/icons';
import {useAddDeleteComponents} from 'state/annotate/annotation-broadcast';

type Props = HTMLAttributes<HTMLDivElement> & {
  width: number;
  height: number;
};

export const Layer: FC<Props> = ({...props}) => {
  const entityId = useDrawingEntityId();
  return entityId ? <LayerWithEntityId entityId={entityId} {...props} /> : null;
};

const LayerWithEntityId: FC<Props & {entityId: EntityId}> = ({entityId, width, height, ...divProps}) => {
  console.debug('render rectangle DrawLayer');

  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);

  const points = useDrawStore(s => s.points);
  const move = useDrawStore(s => s.move);
  const finish = useDrawStore(s => s.finish);

  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const transform = useRenderStore(s => s.viewport.transform);
  const drawAnnoRect = useDrawRect(transform);

  const canvas = useCanvas(
    useCallback(
      ctx => {
        if (!points) return;
        const style = editStyle(ColorPalette.get(entityId));
        drawAnnoRect(ctx, points.anchor, points.mouse, style);
      },
      [drawAnnoRect, points, entityId]
    )
  );

  const {addComponent} = useAddDeleteComponents();
  useHotkeys(
    'esc',
    useCallback(() => finish(), [finish])
  );

  return (
    <div {...divProps}>
      <canvas
        ref={canvas}
        width={width}
        height={height}
        onMouseMove={e => {
          if (!canvas.current) return;
          const {left, top} = canvas.current.getBoundingClientRect();
          const q = {x: e.clientX - left, y: e.clientY - top};
          const p = limitCoordinates(coordinatesCanvasToImage(q, transform), imw, imh);
          move(p);
        }}
        onMouseUp={() => {
          if (!points) {
            return;
          }

          const {anchor: p, mouse: q} = points;
          if (p.x === q.x || p.y === q.y) {
            return;
          }

          const cid = uuidv4();
          const min = {x: Math.min(p.x, q.x), y: Math.min(p.y, q.y)};
          const max = {x: Math.max(p.x, q.x), y: Math.max(p.y, q.y)};

          addComponent({
            sliceIndex,
            entityId,
            component: {
              id: cid,
              type: 'rectangle',
              topLeft: limitCoordinates(min, imw, imh),
              bottomRight: limitCoordinates(max, imw, imh),
            },
          });
          finish();
        }}
      />
      <div style={{position: 'absolute', left: 16, top: 16}}>
        <Space>
          <Tooltip
            title={
              <Space>
                {intl.get('reset')}
                <Tag color="warning">Esc</Tag>
              </Space>
            }
          >
            <Button shape="circle" icon={<ClearOutlined />} onClick={finish} />
          </Tooltip>
        </Space>
      </div>
    </div>
  );
};
