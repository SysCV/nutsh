import {FC, useCallback, useEffect, useState} from 'react';
import intl from 'react-intl-universal';
import {Button, Slider, InputNumber, Tooltip, Space, Tag} from 'antd';
import {
  CaretRightOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  LeftOutlined,
  PauseCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useHotkeys} from 'react-hotkeys-hook';

export type Props = React.ComponentProps<'div'>;

export const FrameSlider: FC<Props> = ({...baseProps}) => {
  const sliceCount = useRenderStore(s => s.sliceUrls.length);
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const setSliceIndex = useRenderStore(s => s.setSliceIndex);

  const [isPlaying, setPlaying] = useState(false);
  useEffect(() => {
    if (isPlaying) {
      setTimeout(() => {
        if (sliceIndex === sliceCount - 1) {
          setPlaying(false);
          return;
        }
        setSliceIndex(sliceIndex + 1);
      }, 500);
    }
  }, [isPlaying, setSliceIndex, sliceCount, sliceIndex]);

  // action
  const toLast = useCallback(() => setSliceIndex(sliceCount - 1), [setSliceIndex, sliceCount]);
  const toNext = useCallback(() => setSliceIndex(sliceIndex + 1), [setSliceIndex, sliceIndex]);
  const toPrev = useCallback(() => setSliceIndex(sliceIndex - 1), [setSliceIndex, sliceIndex]);
  const toFirst = useCallback(() => setSliceIndex(0), [setSliceIndex]);
  const togglePlay = useCallback(() => setPlaying(!isPlaying), [isPlaying]);

  // keyboard
  useHotkeys('shift+right', toLast);
  useHotkeys('right', toNext);
  useHotkeys('left', toPrev);
  useHotkeys('shift+left', toFirst);
  useHotkeys('space', togglePlay);

  return (
    <div {...baseProps}>
      <div style={{display: 'flex', alignItems: 'center', gap: 4}}>
        <Slider
          style={{flexGrow: 1, marginRight: 16}}
          min={1}
          max={sliceCount}
          value={sliceIndex + 1}
          onChange={v => setSliceIndex(v - 1)}
        />
        <Tooltip
          title={
            <Space>
              {intl.get('action.go_to_first_frame')}
              <Tag color="warning">{'⇧ + ←'}</Tag>
            </Space>
          }
        >
          <Button icon={<DoubleLeftOutlined />} size="small" type="text" onClick={toFirst} />
        </Tooltip>
        <Tooltip
          title={
            <Space>
              {intl.get('action.go_to_previous_frame')}
              <Tag color="warning">{'←'}</Tag>
            </Space>
          }
        >
          <Button icon={<LeftOutlined />} size="small" type="text" onClick={toPrev} />
        </Tooltip>
        <InputNumber
          size="small"
          style={{width: 100, textAlign: 'center'}}
          value={sliceIndex + 1}
          min={1}
          max={sliceCount}
          step={1}
          onChange={v => setSliceIndex((v ?? 1) - 1)}
          addonAfter={sliceCount}
        />
        <Tooltip
          title={
            <Space>
              {intl.get('action.go_to_next_frame')}
              <Tag color="warning">{'→'}</Tag>
            </Space>
          }
        >
          <Button icon={<RightOutlined />} size="small" type="text" onClick={toNext} />
        </Tooltip>
        <Tooltip
          title={
            <Space>
              {intl.get('action.go_to_last_frame')}
              <Tag color="warning">{'⇧ + →'}</Tag>
            </Space>
          }
        >
          <Button icon={<DoubleRightOutlined />} size="small" type="text" onClick={toLast} />
        </Tooltip>
        <Tooltip
          title={
            <Space>
              {intl.get('action.play')}
              <Tag color="warning">{'⎵'}</Tag>
            </Space>
          }
        >
          {isPlaying ? (
            <Button icon={<PauseCircleOutlined />} size="small" type="primary" onClick={togglePlay} />
          ) : (
            <Button icon={<CaretRightOutlined />} size="small" type="text" onClick={togglePlay} />
          )}
        </Tooltip>
      </div>
    </div>
  );
};
