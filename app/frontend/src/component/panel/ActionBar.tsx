import React, {FC, useContext, useMemo} from 'react';
import intl from 'react-intl-universal';
import {Tag, Button, Tooltip, ButtonProps, Dropdown, Space} from 'antd';
import {
  SwapOutlined,
  CompressOutlined,
  RollbackOutlined,
  DragOutlined,
  SearchOutlined,
  EyeInvisibleOutlined,
  HighlightOutlined,
  SelectOutlined,
  BorderOutlined,
} from '@ant-design/icons';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import {
  faVectorSquare,
  faDrawPolygon,
  faLinesLeaning,
  faWandMagicSparkles,
  faRotateLeft,
  faRotateRight,
  faChessBoard,
} from '@fortawesome/free-solid-svg-icons';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useTemporalStore as useTemporalAnnoStore} from 'state/annotate/annotation';
import {useStore as useUIStore} from 'state/annotate/ui';
import {ConfigContext} from 'common/context';
import {rectFitTransform} from 'common/geometry';
import {useInvertSelection, useFocusAreas, useDrawing} from 'common/hook';
import {useCanvasSize, leftSidebarWidth} from './layout';

const ActionButton: FC<{helpCode: string; icon: React.ReactNode; hotKey?: string} & ButtonProps> = ({
  helpCode,
  icon,
  hotKey,
  ...buttonProps
}) => {
  return (
    <Tooltip
      title={
        <Space>
          {intl.get(helpCode)}
          <Tag color="warning">{hotKey}</Tag>
        </Space>
      }
      placement="right"
    >
      <Button icon={icon} style={{width: leftSidebarWidth, height: leftSidebarWidth}} type="text" {...buttonProps} />
    </Tooltip>
  );
};

const OnlineSegmentationAction: FC = () => {
  const config = useContext(ConfigContext);

  const mode = useUIStore(s => s.mode);
  const setMode = useUIStore(s => s.setMode);

  const hasSliceUrl = useRenderStore(s => !!s.sliceUrls[s.sliceIndex]);
  const enabled = useMemo(
    () => hasSliceUrl && config.online_segmentation_enabled,
    [config.online_segmentation_enabled, hasSliceUrl]
  );

  return (
    <Tooltip title={intl.get(enabled ? 'action.smart_segment' : 'action.smart_segment_disabled')} placement="right">
      <div>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              {
                key: 'all',
                label: (
                  <Space>
                    <BorderOutlined />
                    {intl.get('action.smart_segment.global')}
                    <Tag color="warning">G</Tag>
                  </Space>
                ),
                onClick: () => setMode('wand'),
              },
              {
                key: 'focus',
                label: (
                  <Space>
                    <SelectOutlined />
                    {intl.get('action.smart_segment.local')}
                    <Tag color="warning">S</Tag>
                  </Space>
                ),
                onClick: () => setMode('wand-focused'),
              },
            ],
          }}
          placement="bottomLeft"
          disabled={!enabled}
        >
          <Button
            icon={
              mode === 'wand' ? (
                <BorderOutlined />
              ) : mode === 'wand-focused' ? (
                <SelectOutlined />
              ) : (
                <FontAwesomeIcon icon={faWandMagicSparkles} />
              )
            }
            style={{width: leftSidebarWidth, height: leftSidebarWidth}}
            type={mode === 'wand' || mode === 'wand-focused' ? 'primary' : 'text'}
          />
        </Dropdown>
      </div>
    </Tooltip>
  );
};

export type Props = React.ComponentProps<'div'>;

export const ActionBar: FC<Props> = ({...baseProps}) => {
  const sliceSize = useRenderStore(s => s.sliceSize);
  const hideUnselected = useRenderStore(s => s.hideUnselected);
  const hasSelection = useRenderStore(s => s.select.ids.size > 0);
  const toggleHideUnselected = useRenderStore(s => s.toggleHideUnselected);
  const setTransform = useRenderStore(s => s.viewport.setTransform);

  const invertSelection = useInvertSelection();

  const mode = useUIStore(s => s.mode);
  const setMode = useUIStore(s => s.setMode);
  const {isDrawing} = useDrawing();

  const [canvasWidth, canvasHeight] = useCanvasSize();
  const canvasSize = useMemo(() => ({width: canvasWidth, height: canvasHeight}), [canvasHeight, canvasWidth]);
  const focusAreas = useFocusAreas(canvasSize);

  // redo and undo
  const {pastStates, futureStates, redo, undo} = useTemporalAnnoStore();

  return (
    <div {...baseProps}>
      <Tooltip title={intl.get('action.tool')} placement="right">
        {/* Directly placing `Dropdown` in a `Tooltip` will warn: findDOMNode is deprecated in StrictMode. */}
        <div>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'rectangle',
                  label: (
                    <Space>
                      <FontAwesomeIcon icon={faVectorSquare} width={16} />
                      {intl.get('action.tool.rectangle')}
                      <Tag color="warning">A</Tag>
                    </Space>
                  ),
                  onClick: () => setMode('rectangle'),
                },
                {
                  key: 'line',
                  label: (
                    <Space>
                      <FontAwesomeIcon icon={faLinesLeaning} width={16} />
                      {intl.get('action.tool.polyline')}
                      <Tag color="warning">L</Tag>
                    </Space>
                  ),
                  onClick: () => setMode('polyline'),
                },
                {
                  key: 'polygon',
                  label: (
                    <Space>
                      <FontAwesomeIcon icon={faDrawPolygon} width={16} />
                      {intl.get('action.tool.polygon')}
                      <Tag color="warning">P</Tag>
                    </Space>
                  ),
                  onClick: () => setMode('polygon'),
                },
                {
                  key: 'mask',
                  label: (
                    <Space>
                      <FontAwesomeIcon icon={faChessBoard} width={16} />
                      {intl.get('action.tool.mask')}
                      <Tag color="warning">M</Tag>
                    </Space>
                  ),
                  onClick: () => setMode('mask'),
                },
              ],
            }}
            placement="bottomLeft"
          >
            <Button
              icon={
                mode === 'rectangle' ? (
                  <FontAwesomeIcon icon={faVectorSquare} />
                ) : mode === 'polyline' ? (
                  <FontAwesomeIcon icon={faLinesLeaning} />
                ) : mode === 'polygon' ? (
                  <FontAwesomeIcon icon={faDrawPolygon} />
                ) : mode === 'mask' ? (
                  <FontAwesomeIcon icon={faChessBoard} />
                ) : (
                  <HighlightOutlined />
                )
              }
              style={{width: leftSidebarWidth, height: leftSidebarWidth}}
              type={
                mode === 'rectangle' || mode === 'polyline' || mode === 'polygon' || mode === 'mask'
                  ? 'primary'
                  : 'text'
              }
            />
          </Dropdown>
        </div>
      </Tooltip>
      <OnlineSegmentationAction />
      <ActionButton
        helpCode="action.reset_viewport"
        hotKey={'⎇ + R'}
        icon={<RollbackOutlined />}
        disabled={!sliceSize}
        onClick={() => {
          if (!sliceSize) return;
          const trans = rectFitTransform(sliceSize, canvasSize);
          setTransform(trans);
        }}
      />
      <ActionButton
        helpCode="action.pan"
        hotKey="⎇ + Drag"
        icon={<DragOutlined />}
        type={mode === 'pan' ? 'primary' : 'text'}
        onClick={() => setMode(mode === 'pan' ? undefined : 'pan')}
      />
      <ActionButton
        helpCode="action.zoom"
        hotKey="⎇ + Wheel"
        icon={<SearchOutlined />}
        type={mode === 'zoom' ? 'primary' : 'text'}
        onClick={() => setMode(mode === 'zoom' ? undefined : 'zoom')}
      />
      <ActionButton
        helpCode="action.undo"
        hotKey="⌘/⌃ + Z"
        icon={<FontAwesomeIcon icon={faRotateLeft} />}
        disabled={isDrawing || pastStates.length === 0}
        onClick={() => undo()}
      />
      <ActionButton
        helpCode="action.redo"
        hotKey="⌘/⌃ + ⇧ + Z"
        icon={<FontAwesomeIcon icon={faRotateRight} />}
        disabled={isDrawing || futureStates.length === 0}
        onClick={() => redo()}
      />
      <ActionButton
        helpCode="action.invert_selection"
        hotKey="I"
        disabled={!hasSelection}
        icon={<SwapOutlined />}
        onClick={invertSelection}
      />
      <ActionButton
        helpCode="action.hide_others"
        hotKey="H"
        icon={<EyeInvisibleOutlined />}
        type={hideUnselected ? 'primary' : 'text'}
        onClick={() => toggleHideUnselected()}
      />
      <ActionButton
        helpCode="action.focus"
        hotKey="F"
        disabled={!hasSelection}
        icon={<CompressOutlined />}
        onClick={focusAreas}
      />
    </div>
  );
};
