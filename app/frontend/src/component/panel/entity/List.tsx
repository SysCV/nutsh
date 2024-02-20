import {CSSProperties, FC, useCallback, useEffect, useRef, useState} from 'react';
import intl from 'react-intl-universal';
import {VariableSizeList as List} from 'react-window';
import {produce} from 'immer';

import {Alert, Empty, Space, Tag, Tooltip} from 'antd';

import {useAnnoStore, State} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';

import {deepEqual} from 'common/util';
import {UI} from 'common/constant';

import type {EntityId} from 'type/annotation';
import type {ProjectSpec} from 'type/project_spec';

import {EntityDisplayId} from './display';
import {EntityCard} from './Card';
import {CloseOutlined} from '@ant-design/icons';

type EntityDisplay = {id: EntityId; displayId: number};

const EntityListInternal: FC<{
  entitySelector: (s: State) => EntityDisplay[];
  projectSpec: ProjectSpec;
  width: number;
  height: number;
  style?: CSSProperties;
}> = ({entitySelector, width, height, projectSpec, style}) => {
  const entities = useAnnoStore(entitySelector, deepEqual);
  useEffect(() => {
    console.debug('reset entity list heights');
    entityList.current?.resetAfterIndex(0);
  }, [entities]);

  // entity card height
  const entityList = useRef<List>(null);
  const [entityCardHeights, setEntityCardHeights] = useState<Map<EntityId, number>>(new Map());
  const getEntityCardHeights = useCallback(
    // `160` is a default guess. The actual height will be updated after first rendering.
    (id: EntityId) => entityCardHeights.get(id) ?? 160,
    [entityCardHeights]
  );

  if (entities.length === 0) {
    return null;
  }

  return (
    <List
      className={`${entities.length}`}
      ref={entityList}
      width={width}
      height={height}
      itemCount={entities.length}
      itemSize={index => getEntityCardHeights(entities[index].id) + UI.spacing}
      style={style}
    >
      {({index, style}) => {
        const e = entities[index];
        return (
          <div key={e.id} style={{...style}}>
            <EntityCard
              displayId={e.displayId}
              entityId={e.id}
              projectSpec={projectSpec}
              style={{cursor: 'pointer'}}
              onRender={({height}) => {
                const oldHeight = entityCardHeights.get(e.id);
                if (height === oldHeight) {
                  return;
                }
                setEntityCardHeights(produce(entityCardHeights, draft => draft.set(e.id, height)));
                entityList.current?.resetAfterIndex(index);
              }}
            />
          </div>
        );
      }}
    </List>
  );
};

function sortEntity(ids: EntityId[]): EntityDisplay[] {
  return ids.map(id => ({id, displayId: EntityDisplayId.get(id)})).sort((e1, e2) => e1.displayId - e2.displayId);
}

export const EntityList: FC<{
  projectSpec: ProjectSpec;
  width: number;
  height: number;
}> = ({width, height, projectSpec}) => {
  console.debug('render EntityList');

  const allSelector = useCallback((s: State) => sortEntity(Object.keys(s.annotation.entities)), []);
  const selectedIds = useRenderStore(s => s.select.ids);
  const clearSelection = useRenderStore(s => s.select.clear);
  const focusSelector = useCallback(() => {
    const ids = new Set(Array.from(selectedIds));
    return sortEntity(Array.from(ids));
  }, [selectedIds]);

  const hasEntities = useAnnoStore(s => Object.keys(s.annotation.entities).length > 0);
  if (!hasEntities) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={intl.get('no_entities')} />;
  }

  return (
    <div style={{position: 'relative'}}>
      {selectedIds.size > 0 && (
        <Alert
          message={intl.get('selected_entities_hint', {count: selectedIds.size})}
          type="warning"
          style={{marginBottom: UI.spacing}}
          closable={true}
          onClose={clearSelection}
          closeIcon={
            <Tooltip
              title={
                <Space>
                  {intl.get('deselect')}
                  <Tag color="warning">esc</Tag>
                </Space>
              }
              placement="left"
            >
              <CloseOutlined />
            </Tooltip>
          }
        />
      )}

      <EntityListInternal
        entitySelector={allSelector}
        width={width}
        height={height}
        projectSpec={projectSpec}
        style={{position: 'absolute'}}
      />
      <EntityListInternal
        entitySelector={focusSelector}
        width={width}
        height={height - (selectedIds.size > 0 ? 56 : 0)}
        projectSpec={projectSpec}
        style={{position: 'absolute', background: UI.darkBackground}}
      />
    </div>
  );
};
