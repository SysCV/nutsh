import {FC, useEffect, CSSProperties, useState, HTMLAttributes, useContext} from 'react';
import shallow from 'zustand/shallow';
import intl from 'react-intl-universal';

import {useTemporalStore as useTemporalAnnoStore} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';

import {useStore as useDrawPolyStore} from 'state/annotate/polychain/draw';
import {useStore as useEditPolyStore} from 'state/annotate/polychain/edit';
import {useStore as useDrawRectStore} from 'state/annotate/rectangle/draw';
import {useStore as useEditRectStore} from 'state/annotate/rectangle/edit';

import {SurroundLayer} from './layer/Surround';
import {TransformLayer} from './layer/Transform';
import {IdleLayer} from './layer/Idle';
import {HoverLayer} from './layer/Hover';
import {TranslateLayer} from './layer/Translate';

import {Layer as DrawPolyLayer} from './layer/polychain/Draw';
import {Layer as EditPolyLayer} from './layer/polychain/Edit';
import {Layer as DrawRectLayer} from './layer/rectangle/Draw';
import {Layer as EditRectLayer} from './layer/rectangle/Edit';
import {Layer as DrawMaskLayer} from './layer/mask/Draw';
import {Layer as SegmentMaskLayer} from './layer/mask/Segment';

import {useDrawing, useFocusAreas, useInvertSelection} from 'common/hook';
import {useHotkeys} from 'react-hotkeys-hook';
import {useKeyPressed} from 'common/keyboard';
import {Key} from 'ts-key-enum';
import {SizedContainer} from 'component/SizedContainer';
import {ConfigContext} from 'common/context';
import {Button, Space, Tag, Tooltip} from 'antd';
import {CloseOutlined} from '@ant-design/icons';

const FullSize: CSSProperties = {position: 'absolute', left: 0, top: 0, width: '100%', height: '100%'};

export const AnnotateLayer: FC<HTMLAttributes<HTMLDivElement>> = ({...divProps}) => {
  console.debug('render AnnotateLayer');

  // Render nothing if the slice image is not loaded
  const isLoaded = useRenderStore(s => !!s.sliceSize);
  return isLoaded ? <Loaded {...divProps} /> : null;
};

const Loaded: FC<HTMLAttributes<HTMLDivElement>> = ({...divProps}) => {
  // Reset history when a new annotation is started.
  const {clear} = useTemporalAnnoStore();
  useEffect(() => clear(), [clear]);

  const isDrawingPoly = useDrawPolyStore(s => s.vertices.length > 0);
  const isEditingPoly = useEditPolyStore(s => s.data !== undefined);
  const isDrawingRect = useDrawRectStore(s => !!s.points);
  const isEditingRect = useEditRectStore(s => !!s.data);

  const isDrawingMask = useUIStore(s => s.mode === 'mask');
  const isUsingWand = useUIStore(s => s.mode === 'wand' || s.mode === 'wand-focused');

  const isEditing = isEditingPoly || isEditingRect;

  const translateData = useRenderStore(s => s.translate.data);
  const isSurrounding = useRenderStore(s => !!s.surround.data);
  const isTransforming = useIsTransforming();

  const [isMouseIn, setMouseIn] = useState(false);
  return (
    <SizedContainer {...divProps}>
      {([w, h]) => (
        <div
          id="annotation-container"
          style={FullSize}
          onMouseEnter={() => setMouseIn(true)}
          onMouseLeave={() => setMouseIn(false)}
        >
          {isMouseIn && <CursorUpdater />}
          <>
            <KeyboardListener width={w} height={h} />

            {!isTransforming && <IdleLayer style={FullSize} />}
            {!isEditing && !isTransforming && !isDrawingMask && !isUsingWand && <HoverLayer style={FullSize} />}
            {isSurrounding && <SurroundLayer width={w} height={h} style={FullSize} />}
            {!!translateData && <TranslateLayer data={translateData} style={FullSize} />}

            {isDrawingPoly && <DrawPolyLayer width={w} height={h} style={FullSize} />}
            {isEditingPoly && <EditPolyLayer width={w} height={h} style={FullSize} />}
            {isDrawingRect && <DrawRectLayer width={w} height={h} style={FullSize} />}
            {isEditingRect && <EditRectLayer width={w} height={h} style={FullSize} />}
            {isDrawingMask && <DrawMaskLayer width={w} height={h} style={FullSize} />}
            {isUsingWand && <SegmentMaskLayer width={w} height={h} style={FullSize} />}

            {isTransforming && <TransformLayer style={FullSize} canvasSize={[w, h]} />}
          </>
          {<Toolbar />}
        </div>
      )}
    </SizedContainer>
  );
};

function useIsTransforming() {
  const isAltPressed = useKeyPressed(Key.Alt);
  const activeMode = useUIStore(s => s.mode === 'pan' || s.mode === 'zoom');
  return isAltPressed || activeMode;
}

// TODO(hxu): remove global cursor management and let each component to manage its cursor.
const CursorUpdater: FC = () => {
  const hover = useRenderStore(s => s.mouse.hover, shallow);
  const mode = useUIStore(s => s.mode);
  const isTransforming = useIsTransforming();
  const isTranslating = useRenderStore(s => !!s.translate.data);
  const isSyncing = useRenderStore(s => s.isSyncing);

  const [cursor, setCursor] = useState<string>('default');
  useEffect(() => {
    if (isSyncing) {
      setCursor('wait');
    } else if (isTranslating) {
      setCursor('grab');
    } else if (isTransforming) {
      if (mode === 'zoom') {
        setCursor('zoom-in');
      } else {
        setCursor('move');
      }
    } else if (mode === 'mask') {
      setCursor('none');
    } else if (hover) {
      const {vertexIdx, midpointIdx, controlIdx} = hover;
      if (vertexIdx !== undefined || midpointIdx !== undefined || controlIdx !== undefined) {
        setCursor('move');
      } else {
        setCursor('pointer');
      }
    } else {
      setCursor('auto');
    }
  }, [hover, isSyncing, isTransforming, isTranslating, mode]);
  useEffect(() => {
    document.body.style.cursor = cursor;
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [cursor]);
  return <></>;
};

const KeyboardListener: FC<{width: number; height: number}> = ({width, height}) => {
  const config = useContext(ConfigContext);
  const enableWand = config.online_segmentation_enabled;

  const focusAreas = useFocusAreas({width, height});

  const hasSelection = useRenderStore(s => s.select.ids.size > 0);
  const clearSelect = useRenderStore(s => s.select.clear);
  const toggleHideUnselected = useRenderStore(s => s.toggleHideUnselected);
  const invertSelection = useInvertSelection();

  const {isDrawing, isDrawingPoly, isDrawingRect} = useDrawing();

  const isManipulating = useRenderStore(s => !!s.manipulate.data);
  const stopManipulating = useRenderStore(s => s.manipulate.stop);

  const mode = useUIStore(s => s.mode);
  const setMode = useUIStore(s => s.setMode);

  useHotkeys('h', () => toggleHideUnselected());
  useHotkeys('i', () => invertSelection());
  useHotkeys('f', () => focusAreas());

  useHotkeys('a', () => setMode('rectangle'));
  useHotkeys('l', () => setMode('polyline'));
  useHotkeys('p', () => setMode('polygon'));
  useHotkeys('m', () => setMode('mask'));
  useHotkeys('g', () => enableWand && setMode('wand'));
  useHotkeys('s', () => enableWand && setMode('wand-focused'));

  useHotkeys('esc', () => {
    if (isManipulating) {
      stopManipulating();
    } else if (hasSelection && !isDrawing) {
      clearSelect();
    } else if ((mode === 'polygon' || mode === 'polyline') && !isDrawingPoly) {
      setMode(undefined);
    } else if (mode === 'rectangle' && !isDrawingRect) {
      setMode(undefined);
    } else if (mode === 'pan' || mode === 'zoom') {
      setMode(undefined);
    }
  });

  return <></>;
};

const Toolbar: FC = () => {
  const mode = useUIStore(s => s.mode);
  const setMode = useUIStore(s => s.setMode);
  const isDrawingPoly = useDrawPolyStore(s => s.vertices.length > 0);
  const isDrawingRect = useDrawRectStore(s => !!s.points);

  return (
    <div style={{position: 'absolute', left: 16, top: 16}}>
      {(((mode === 'polygon' || mode === 'polyline') && !isDrawingPoly) ||
        (mode === 'rectangle' && !isDrawingRect)) && (
        <Space>
          <Tooltip
            title={
              <Space>
                {intl.get('cancel')}
                <Tag color="warning">Esc</Tag>
              </Space>
            }
          >
            <Button shape="circle" icon={<CloseOutlined />} onClick={() => setMode(undefined)} />
          </Tooltip>
        </Space>
      )}
    </div>
  );
};
