import {FC} from 'react';
import intl from 'react-intl-universal';
import {Form, TreeSelect, TreeSelectProps, Space, Tag} from 'antd';

import {useStore as useRenderStore} from 'state/annotate/render';

import {CategoryAbbreviation} from 'component/panel/entity/display';

import type {EntityId} from 'type/annotation';
import type {ProjectSpec, Entry} from 'type/project_spec';
import {useEntityCategories} from 'common/hook';
import {useAnnoBroadcastStore} from 'state/annotate/annotation-broadcast';

export function makeTreeNode(
  entry: Entry,
  keyPrefix: string,
  keepPath = false
): Exclude<TreeSelectProps['treeData'], undefined>[0] {
  const isLeaf = (entry.subentries?.length ?? 0) === 0;
  const key = isLeaf && !keepPath ? entry.name : `${keyPrefix}.${entry.name}`;
  return {
    key,
    value: key,
    title: entry.name + (isLeaf ? ` (${CategoryAbbreviation.get(entry.name)})` : ''),
    selectable: isLeaf,
    children: entry.subentries?.map(sub => makeTreeNode(sub, key, keepPath)),
  };
}

export const EntityForm: FC<{entityId: EntityId; projectSpec: ProjectSpec}> = ({entityId, projectSpec}) => {
  const sidx = useRenderStore(s => s.sliceIndex);
  const categories = useEntityCategories(entityId, sidx);
  const setEntityCategory = useAnnoBroadcastStore('setEntityCategory');
  const clearEntityCategory = useAnnoBroadcastStore('clearEntityCategory');

  return (
    <Form layout="vertical" style={{width: 200}}>
      {projectSpec.categories?.map(({name: category, entries, multiple, slicewise}) => {
        const sliceIndex = slicewise ? sidx : undefined;
        return (
          <Form.Item
            label={
              <Space>
                {category}
                {slicewise && <Tag color="orange">{intl.get('slicewise')}</Tag>}
              </Space>
            }
            key={category}
          >
            {multiple ? (
              <TreeSelect
                multiple={true}
                showSearch={true}
                value={Object.keys(categories[category] ?? {})}
                onChange={newEntries =>
                  newEntries.length > 0
                    ? setEntityCategory({sliceIndex, entityId, category, entries: newEntries})
                    : clearEntityCategory({sliceIndex, entityId, category})
                }
                treeData={entries.map(ent => makeTreeNode(ent, category))}
              />
            ) : (
              <TreeSelect
                showSearch={true}
                value={Object.keys(categories[category] ?? {})[0]}
                onSelect={entry => setEntityCategory({sliceIndex, entityId, category, entries: [entry]})}
                treeData={entries.map(ent => makeTreeNode(ent, category))}
                allowClear={true}
                onClear={() => clearEntityCategory({sliceIndex, entityId, category})}
              />
            )}
          </Form.Item>
        );
      })}
    </Form>
  );
};
