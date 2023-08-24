import {FC, useContext, useMemo, useState} from 'react';
import intl from 'react-intl-universal';
import {Link} from 'react-router-dom';
import {Space, Table, Button, TableProps, Tag, Pagination, Input} from 'antd';
import {
  VideoCameraAddOutlined,
  EditOutlined,
  VideoCameraOutlined,
  SearchOutlined,
  BarsOutlined,
} from '@ant-design/icons';
import {useStore} from 'state/client/store';
import {routePath} from 'common/route';
import {ConfigContext} from 'common/context';
import type {Project, Video} from 'openapi/nutsh';
import {DeleteVideoButton} from './DeleteVideoButton';

const {Search} = Input;

export type Props = TableProps<Video> & {
  projectId: Project['id'];
  videos: Video[];
};

const pageSize = 100;

export const VideoTable: FC<Props> = ({projectId, videos, ...baseProps}) => {
  const editVideo = useStore(s => s.video.mutate.startUpdate);
  const config = useContext(ConfigContext);
  const [page, setPage] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const records = useMemo(
    () => (search ? videos.filter(v => v.name.toLowerCase().includes(search.toLowerCase())) : videos),
    [search, videos]
  );

  return (
    <Table
      pagination={false}
      dataSource={records.slice(page * pageSize, (page + 1) * pageSize)}
      rowKey={r => r.id}
      columns={[
        {
          title: (
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Space>
                {intl.get('resource')}
                <AddVideoButton projectId={projectId} />
                <Search style={{width: 200}} allowClear={true} onSearch={setSearch} />
              </Space>
              <Space>
                {search && <Tag icon={<SearchOutlined />}>{search}</Tag>}
                <Tag icon={<BarsOutlined />}>{records.length}</Tag>
                {records.length > 0 && (
                  <Pagination
                    simple
                    current={page + 1}
                    onChange={p => setPage(p - 1)}
                    total={records.length}
                    pageSize={pageSize}
                  />
                )}
              </Space>
            </div>
          ),
          render: (_, r) => {
            const {name} = r;
            return (
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Link
                  to={routePath(`/video/${r.id}`)}
                  reloadDocument={
                    // `reloadDocument=true` is important to ensure that each
                    // annotation panel is a fresh rendering. Otherwise, we must
                    // manually reset annotate state upon entering or leaving
                    // annotation panel, which can be quite complicated,
                    // c.f. https://docs.pmnd.rs/zustand/guides/how-to-reset-state
                    true
                  }
                >
                  <Space>
                    <VideoCameraOutlined />
                    {name}
                  </Space>
                </Link>
                <Space>
                  <Button
                    icon={<EditOutlined />}
                    key="edit"
                    type="text"
                    onClick={() => editVideo(r)}
                    disabled={config.readonly}
                    title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
                  />
                  <DeleteVideoButton videoId={r.id} />
                </Space>
              </div>
            );
          },
        },
      ]}
      {...baseProps}
    />
  );
};

export const AddVideoButton: FC<{projectId: Project['id']}> = ({projectId}) => {
  const config = useContext(ConfigContext);
  const addVideo = useStore(s => s.video.mutate.startCreate);
  return (
    <Button
      icon={<VideoCameraAddOutlined />}
      type="primary"
      onClick={() => addVideo(projectId)}
      disabled={config.readonly}
      title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
    >
      {intl.get('add_video')}
    </Button>
  );
};
