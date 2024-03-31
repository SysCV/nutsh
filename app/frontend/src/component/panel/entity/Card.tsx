/** @jsxImportSource @emotion/react */

import React, {FC, useEffect, useRef, CSSProperties, useMemo} from 'react';
import intl from 'react-intl-universal';
import shallow from 'zustand/shallow';
import {css} from '@emotion/react';

import {Space, Card, Typography, Button, Popconfirm, Progress, Spin} from 'antd';
import {EditOutlined, DeleteOutlined} from '@ant-design/icons';

import {useAnnoStore} from 'state/annotate/annotation-provider';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useUIStore} from 'state/annotate/ui';

import {EditColor} from 'common/constant';
import {convertRGBA2Hex} from 'common/color';

import type {EntityId} from 'type/annotation';
import type {ProjectSpec} from 'type/project_spec';
import {ColorPalette} from './display';
import {useEntityCategories} from 'common/hook';
import {useDeleteEntities} from 'state/annotate/annotation-broadcast';

const {Paragraph, Text} = Typography;

function entityFrameDescription(slices: number[]): React.ReactNode[] {
  const sliceIdxs = slices.sort((a, b) => a - b);

  // render slice indices into ranges like `a-b c-d e-f ...`
  const ranges: [number, number][] = [];
  sliceIdxs.forEach(idx => {
    const n = ranges.length;
    if (n === 0) {
      ranges.push([idx, idx]);
      return;
    }
    const last = ranges[n - 1];
    if (last[1] + 1 === idx) {
      last[1] = idx;
      return;
    }
    ranges.push([idx, idx]);
  });

  const rangeDescs = ranges.map(r =>
    r[0] === r[1] ? (
      <Text key={r[0]} code>{`${r[0] + 1}`}</Text>
    ) : (
      <Text key={r[0]} code>{`${r[0] + 1}-${r[1] + 1}`}</Text>
    )
  );

  return rangeDescs;
}

export const EntityCard: FC<{
  displayId: number;
  entityId: EntityId;
  projectSpec: ProjectSpec;
  onRender: (size: {width: number; height: number}) => void;
  style?: CSSProperties;
}> = ({displayId, entityId, projectSpec, style, onRender}) => {
  // CAREFULLY use necessary (calcualted) states to avoid unnecessary rendering!
  console.debug(`render EntityCard ${entityId}`);
  const ref = useRef<HTMLDivElement>(null);

  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const categories = useEntityCategories(entityId, sliceIndex);

  const sliceIndices = useAnnoStore(s => {
    const e = s.annotation.entities[entityId];
    if (!e) return [];
    const g = e.geometry;
    return Object.keys(g.slices).map(s => parseInt(s));
  }, shallow);

  const {deleteEntities} = useDeleteEntities();

  const isSelected = useRenderStore(s => s.select.ids.has(entityId));
  const isHovered = useRenderStore(s => s.mouse.hover?.entityId === entityId);
  const setSliceIndex = useRenderStore(s => s.setSliceIndex);
  const focusEntity = useRenderStore(s => s.focusEntity);
  const setEditingEntityId = useRenderStore(s => s.setEditingEntityId);

  const hex = useMemo(() => convertRGBA2Hex(...ColorPalette.get(entityId)), [entityId]);

  // call on every render
  useEffect(() => {
    if (!ref.current) return;
    const {clientWidth: width, clientHeight: height} = ref.current;
    onRender({width, height});
  });

  return (
    <Card
      ref={ref}
      title={
        <Space>
          <span>#{displayId}</span>
          <div style={{width: 8, height: 8, borderRadius: 4, background: hex}} />
        </Space>
      }
      size="small"
      style={{
        ...(style ?? {}),
        transition: 'border-color 0.3s',
        borderColor: isHovered || isSelected ? convertRGBA2Hex(...EditColor) : undefined,
      }}
      css={css`
        &:hover {
          border-color: ${convertRGBA2Hex(...EditColor)};
        }
      `}
      onClick={e => {
        focusEntity(entityId);

        // It is not uncommon that the annotator single click the entity card to select it to start drawing on the
        // current slice. Therefore, we jump to the first slice of this entity upon double clicking.
        if (e.detail === 2 && !sliceIndices.includes(sliceIndex)) {
          setSliceIndex(Math.min(...sliceIndices));
        }
      }}
      extra={[
        (projectSpec.categories?.length ?? 0) > 0 && (
          <Button
            key="edit"
            icon={<EditOutlined />}
            size="small"
            type="text"
            onClick={e => {
              e.stopPropagation();
              setEditingEntityId(entityId);
            }}
          />
        ),
        <Popconfirm
          key="delete"
          placement="left"
          title={intl.get('are_you_sure')}
          okButtonProps={{danger: true}}
          onConfirm={e => {
            e?.stopPropagation();
            deleteEntities({entityIds: [entityId]});
          }}
          onCancel={e => e?.stopPropagation()}
        >
          <Button icon={<DeleteOutlined />} size="small" type="text" onClick={e => e.stopPropagation()} />
        </Popconfirm>,
      ]}
    >
      <TrackingProgress eid={entityId} />
      <Paragraph style={{marginBottom: 0}}>
        <Text strong style={{marginRight: 4}}>
          {intl.get('frame')}
        </Text>
        {sliceIndices.length > 0 ? (
          entityFrameDescription(sliceIndices)
        ) : (
          <Text key="empty" type="secondary">
            {intl.get('no_annotations')}
          </Text>
        )}
      </Paragraph>
      {projectSpec.categories?.map(cat => {
        const entries = categories[cat.name] ?? {};
        const names = Object.keys(entries).sort();
        return names.length === 0 ? null : (
          <Paragraph key={cat.name} style={{marginBottom: 0, marginTop: '1em'}}>
            <Space style={{marginRight: 4}} size={4}>
              <Text strong>{cat.name}</Text>
            </Space>
            {names.map(name => (
              <Text code key={name}>
                {name}
              </Text>
            ))}
          </Paragraph>
        );
      })}
    </Card>
  );
};

const TrackingProgress: FC<{eid: string}> = ({eid}) => {
  const progress = useUIStore(s => s.tracking[eid]);
  return progress === undefined ? null : progress > 0 ? (
    <Progress percent={progress * 100} showInfo={false} />
  ) : (
    <Spin size="small" style={{margin: '8px 0'}} />
  );
};
