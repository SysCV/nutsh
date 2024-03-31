import {FC, HTMLAttributes, useCallback, useMemo} from 'react';
import shallow from 'zustand/shallow';
import intl from 'react-intl-universal';
import {v4 as uuidv4} from 'uuid';
import {message} from 'antd';

import {useAnnoHistoryStore} from 'state/annotate/annotation-provider';
import {EntityComponentId, useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';
import {useStore as useEditPolyStore} from 'state/annotate/polychain/edit';
import {useStore as useEditRectStore} from 'state/annotate/rectangle/edit';

import {useDrawing, useSliceSelection} from 'common/hook';
import {useVisibleEntities} from 'common/render';
import {CategoryAbbreviation, ColorPalette, EntityDisplayId} from 'component/panel/entity/display';

import type {Component, SliceIndex} from 'type/annotation';
import {newComponentAdapter} from 'common/adapter';
import {createComponentSVG, StyledComponents} from 'common/svg';
import {editStyle, idleStyle} from 'common/constant';
import {convertRGBA2Hex, isLightBackground} from 'common/color';
import {useHotkeys} from 'react-hotkeys-hook';
import {coordinatesImageToCanvas} from 'common/geometry';
import {usePaste} from 'state/annotate/annotation-broadcast';

export const IdleLayer: FC<HTMLAttributes<HTMLDivElement>> = ({...divProps}) => {
  console.debug('render IdleLayer');
  const {width: imw, height: imh} = useRenderStore(s => s.sliceSize!, shallow);

  const transform = useRenderStore(s => s.viewport.transform);
  const {
    scale: r,
    translation: [dx, dy],
  } = transform;

  const isTuning = useRenderStore(s => s.isTuning);
  const {isDrawing} = useDrawing();

  const settings = useRenderSettings();
  const svgUrl = useMemo(() => createComponentSVG(settings, [imw, imh]), [imw, imh, settings]);

  return (
    <div {...divProps}>
      {!isTuning && (
        <>
          <img
            src={svgUrl}
            alt="annotation"
            style={{width: imw * r, height: imh * r, position: 'absolute', left: dx, top: dy, userSelect: 'none'}}
          />
          <TextLayer
            settings={settings}
            style={{position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'}}
          />
        </>
      )}

      {!isDrawing && <IdleLayerTemporal />}
      <Copy />
      <Paste />
    </div>
  );
};

const Copy: FC = () => {
  const {components} = useSliceSelection();

  const [messageApi, contextHolder] = message.useMessage();
  const copy = useRenderStore(s => s.copy);
  useHotkeys(
    'ctrl+c, meta+c',
    useCallback(() => {
      copy(components);
      messageApi.success(intl.get('copied'));
    }, [copy, messageApi, components]),
    {enabled: components.length > 0}
  );

  return <>{contextHolder}</>;
};

const Paste: FC = () => {
  const copying = useRenderStore(s => s.copying);
  return copying ? <PasteLoaded copying={copying} /> : null;
};

const PasteLoaded: FC<{copying: {ecids: EntityComponentId[]; sliceIndex: SliceIndex}}> = ({
  copying: {ecids, sliceIndex},
}) => {
  const sidx = useRenderStore(s => s.sliceIndex);
  const {paste} = usePaste();

  useHotkeys(
    'ctrl+v, meta+v',
    useCallback(() => {
      const cs = ecids.map(ec => ({...ec, newComponentId: uuidv4()}));
      paste({
        entityComponents: cs,
        sourceSliceIndex: sliceIndex,
        targetSliceIndex: sidx,
      });
    }, [sliceIndex, ecids, sidx, paste])
  );

  return <></>;
};

type RenderSetting = StyledComponents & {
  texts: string[];
  textColor: [number, number, number];
};

function useRenderSettings(): RenderSetting[] {
  const entities = useVisibleEntities();
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const selectedIds = useRenderStore(s => s.select.ids);
  const e1 = useEditPolyStore(s => s.data?.target);
  const e2 = useEditRectStore(s => s.data?.target);
  const editingEntityId = e1?.entityId ?? e2?.entityId;
  const editingComponentId = e1?.componentId ?? e2?.componentId;
  const isDrawingMask = useUIStore(s => s.mode === 'mask');

  const settings: RenderSetting[] = [];
  for (const [, e] of Object.entries(entities)) {
    const slice = e.geometry.slices[sliceIndex];
    if (!slice) continue;

    const [r, g, b] = ColorPalette.get(e.id);
    const style = selectedIds.has(e.id) ? editStyle([r, g, b]) : idleStyle([r, g, b]);

    const components: Component[] = [];
    for (const [, c] of Object.entries(slice)) {
      if (e.id === editingEntityId && c.id === editingComponentId) {
        // Do not draw the editing component but its editing copy.
        continue;
      }
      if (c.type === 'mask' && isDrawingMask) {
        // Do not draw mask when editing mask
        continue;
      }
      components.push(c);
    }

    const texts: string[] = [`#${EntityDisplayId.get(e.id)}`];
    const cats = {...e.sliceCategories?.[sliceIndex], ...e.globalCategories};
    const vs: string[] = [];
    for (const [, c] of Object.entries(cats)) {
      for (const [v] of Object.entries(c)) {
        vs.push(CategoryAbbreviation.get(v));
      }
    }
    if (vs.length > 0) {
      texts.push(vs.join(' '));
    }

    settings.push({components, style, texts, textColor: [r, g, b]});
  }

  return settings;
}

const IdleLayerTemporal: FC = () => {
  const undo = useAnnoHistoryStore(s => s.undo);
  const redo = useAnnoHistoryStore(s => s.redo);
  useHotkeys('ctrl+z, meta+z', () => undo());
  useHotkeys('ctrl+shift+z, meta+shift+z', () => redo());
  return <></>;
};

const TextLayer: FC<HTMLAttributes<HTMLDivElement> & {settings: RenderSetting[]}> = ({settings, ...divProps}) => {
  const showSummary = useRenderStore(s => s.showSummary);
  const transform = useRenderStore(s => s.viewport.transform);
  if (!showSummary) {
    return null;
  }

  const tags = settings
    .map(({components, texts, textColor}) =>
      components.map(component => {
        const adapter = newComponentAdapter(component);
        const p = adapter.centroid();
        const q = coordinatesImageToCanvas(p, transform);
        const t = texts.join(' ');
        return (
          <div
            key={(component as Component).id /* we know here each component has an id */}
            style={{
              position: 'absolute',
              left: q.x,
              top: q.y,
              transform: 'translate(-50%, -50%)',
              userSelect: 'none',
              background: convertRGBA2Hex(...textColor),
              color: isLightBackground(...textColor) ? 'black' : 'white',
              padding: 4,
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            {t}
          </div>
        );
      })
    )
    .flat();

  return <div {...divProps}>{tags}</div>;
};
