import {FC, useCallback, useState, HTMLAttributes, useMemo, useRef} from 'react';
import shallow from 'zustand/shallow';

import {useAnnoStore} from 'state/annotate/annotation-provider';
import {useStore as useRenderStore} from 'state/annotate/render';
import {TranslateData} from 'state/annotate/render/translate';

import {coordinatesCanvasToImage} from 'common/geometry';

import {ComponentDetail, Coordinates, EntityId} from 'type/annotation';
import {newComponentAdapter} from 'common/adapter';
import {createComponentSVG} from 'common/svg';
import {editStyle} from 'common/constant';
import {ColorPalette} from '../entity/display';
import {getComponent} from 'state/annotate/annotation';
import {useTranslate} from 'state/annotate/annotation-broadcast';

type Props = HTMLAttributes<HTMLDivElement> & {
  data: TranslateData;
};

export const TranslateLayer: FC<Props> = ({data, ...divProps}) => {
  const {components: ecids, sliceIndex: sidx, anchorImage: anchor} = data;
  const [offset, setOffset] = useState<Coordinates>({x: 0, y: 0});

  const transform = useRenderStore(s => s.viewport.transform);
  const {
    scale: r,
    translation: [dx, dy],
  } = transform;
  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);

  const clearSelect = useRenderStore(s => s.select.clear);
  const finish = useRenderStore(s => s.translate.finish);
  const {translate} = useTranslate();

  const ecs = useAnnoStore(
    useCallback(
      s => {
        const ecs: [EntityId, ComponentDetail][] = [];
        ecids.forEach(({entityId: eid, componentId: cid}) => {
          const c = getComponent(s, sidx, eid, cid);
          if (c) {
            const adapter = newComponentAdapter(c);
            ecs.push([eid, adapter.translate(offset)]);
          }
        });
        return ecs;
      },
      [ecids, sidx, offset]
    )
  );
  const svg = useMemo(() => {
    return createComponentSVG(
      ecs.map(([eid, c]) => ({components: [c], style: editStyle(ColorPalette.get(eid))})),
      [imw, imh]
    );
  }, [ecs, imw, imh]);

  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      onMouseMove={e => {
        if (!ref.current) return;

        e.preventDefault();
        e.stopPropagation();

        const {left, top} = ref.current.getBoundingClientRect();
        const q = {x: e.clientX - left, y: e.clientY - top};
        const p = coordinatesCanvasToImage(q, transform);
        const o = {x: p.x - anchor.x, y: p.y - anchor.y};
        setOffset(o);
      }}
      onMouseUp={() => {
        translate({entityComponents: ecids, sliceIndex: sidx, offsetX: offset.x, offsetY: offset.y});
        finish();
        clearSelect();
      }}
      {...divProps}
    >
      <div style={{width: '100%', height: '100%', position: 'relative'}}>
        <img
          src={svg}
          alt="translating"
          style={{width: imw * r, height: imh * r, position: 'absolute', left: dx, top: dy, userSelect: 'none'}}
        />
      </div>
    </div>
  );
};
