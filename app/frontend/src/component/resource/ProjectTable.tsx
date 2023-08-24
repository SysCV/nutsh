import {FC, useContext, useMemo, useState} from 'react';
import intl from 'react-intl-universal';
import {Link} from 'react-router-dom';
import {Space, Button, Table, Typography, TableProps, Input, Tag, Pagination} from 'antd';
import {UploadOutlined, PlusOutlined, EditOutlined, SearchOutlined, BarsOutlined} from '@ant-design/icons';
import {useStore} from 'state/client/store';
import {ConfigContext} from 'common/context';
import {routePath} from 'common/route';
import {DeleteProjectButton} from './DeleteProjectButton';
import {Project} from 'openapi/nutsh';

const {Text} = Typography;
const {Search} = Input;

const pageSize = 100;

export type Props = TableProps<Project> & {
  projects: Project[];
};

export const ProjectTable: FC<Props> = ({projects, ...baseProps}) => {
  const config = useContext(ConfigContext);

  const addProject = useStore(s => s.project.mutate.startCreate);
  const editProject = useStore(s => s.project.mutate.startUpdate);
  const importProject = useStore(s => s.project.mutate.startImport);

  const [page, setPage] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const records = useMemo(
    () => (search ? projects.filter(v => v.name.toLowerCase().includes(search.toLowerCase())) : projects),
    [search, projects]
  );

  return (
    <>
      <Table
        pagination={false}
        dataSource={records.slice(page * pageSize, (page + 1) * pageSize)}
        rowKey={r => r.id}
        columns={[
          {
            title: (
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <Space>
                  {intl.get('project')}
                  <Button
                    type="primary"
                    onClick={addProject}
                    icon={<PlusOutlined />}
                    disabled={config.readonly}
                    title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
                  >
                    {intl.get('add')}
                  </Button>
                  <Button
                    type="primary"
                    onClick={importProject}
                    icon={<UploadOutlined />}
                    disabled={config.readonly}
                    title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
                  >
                    {intl.get('import')}
                  </Button>
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
            render: (_, p) => {
              const {name, remark} = p;
              return (
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                  <Space>
                    <Link to={routePath(`/project/${p.id}`)}>{name}</Link>
                    <Text type="secondary">{remark}</Text>
                  </Space>
                  <Space>
                    <Button
                      icon={<EditOutlined />}
                      key="edit"
                      type="text"
                      onClick={() => editProject(p)}
                      disabled={config.readonly}
                      title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
                    />
                    <DeleteProjectButton projectId={p.id} />
                  </Space>
                </div>
              );
            },
          },
        ]}
        {...baseProps}
      />
    </>
  );
};
