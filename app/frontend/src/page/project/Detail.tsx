import {FC, useContext, useState} from 'react';
import intl from 'react-intl-universal';
import {useParams} from 'react-router-dom';
import {useNavigate} from 'react-router-dom';
import {useWindowHeight} from '@react-hook/window-size';
import {
  Typography,
  Tag,
  Tree,
  Card,
  Space,
  Button,
  Popconfirm,
  TreeDataNode,
  Drawer,
  Skeleton,
  Empty,
  Result,
} from 'antd';
import {DownloadOutlined, ArrowLeftOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined} from '@ant-design/icons';

import {useStore} from 'state/client/store';
import {useGetProject, useDeleteProject} from 'state/server/project';

import {UI} from 'common/constant';
import {routePath} from 'common/route';
import {ConfigContext, NutshClientContext} from 'common/context';

import PageLayout from 'page/Layout';
import {FormModal as ProjectFormModal} from 'component/resource/MutateProject';
import {FormModal as VideoFormModal} from 'component/resource/MutateVideo';
import {ExportModal as ProjectExportModal} from 'component/resource/ExportProject';
import {AddVideoButton, VideoTable} from 'component/resource/VideoTable';

import type {Project} from 'openapi/nutsh';
import type {ProjectSpec, Entry} from 'type/project_spec';
import {useListVideos} from 'state/server/video';

const {Title, Text} = Typography;

function makeTreeNode(entry: Entry, keyPrefix: string): TreeDataNode {
  const key = `${keyPrefix}-${entry.name}`;
  return {
    key,
    title: entry.name,
    children: entry.subentries?.map(sub => makeTreeNode(sub, key)),
  };
}

const DetailReady: FC<{project: Project; spec: ProjectSpec}> = ({project, spec}) => {
  const client = useContext(NutshClientContext);
  const navigate = useNavigate();

  // client state
  const editProject = useStore(s => s.project.mutate.startUpdate);

  // server state
  const {isFetching: isListingVideos, data: listVideosData} = useListVideos(client, project.id);
  const {mutate: deleteProject, isLoading: isDeletingProject} = useDeleteProject(client);

  // local
  const [showExport, setShowExport] = useState<boolean>(false);
  const [showSpec, setShowSpec] = useState<boolean>(false);

  // some constant
  const winHeight = useWindowHeight();
  const tableHeaderHeight = 55;
  const pageHeaderHeight = 66;
  const tableHeight = winHeight - UI.navbarHeight - UI.spacing * 3 - pageHeaderHeight - tableHeaderHeight;

  const config = useContext(ConfigContext);

  return (
    <div>
      <Card
        title={
          <Space align="center">
            <Button icon={<ArrowLeftOutlined />} type="text" onClick={() => navigate(routePath('/projects'))} />
            <Title level={5} style={{marginBottom: 0}}>
              {project.name}
            </Title>
            <Text type="secondary">{project.remark}</Text>
          </Space>
        }
        headStyle={{borderBottom: 'none'}}
        bodyStyle={{display: 'none'}}
        extra={[
          <Button icon={<DownloadOutlined />} key="download" type="text" onClick={() => setShowExport(true)} />,
          <Button icon={<InfoCircleOutlined />} key="info" type="text" onClick={() => setShowSpec(true)} />,
          <Button
            icon={<EditOutlined />}
            key="edit"
            type="text"
            onClick={() => editProject(project)}
            disabled={config.readonly}
            title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
          />,
          config.readonly ? (
            <Button
              icon={<DeleteOutlined />}
              type="text"
              loading={isDeletingProject}
              disabled={config.readonly}
              title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
            />
          ) : (
            <Popconfirm
              key="delete"
              placement="left"
              title={intl.get('are_you_sure')}
              okButtonProps={{danger: true}}
              onConfirm={() =>
                deleteProject(
                  {projectId: project.id},
                  {
                    onSuccess: () => navigate(routePath('/projects'), {replace: true}),
                  }
                )
              }
            >
              <Button icon={<DeleteOutlined />} type="text" loading={isDeletingProject} />
            </Popconfirm>
          ),
        ]}
      />

      {isListingVideos ? (
        <Skeleton active={true} style={{marginTop: UI.spacing}} />
      ) : listVideosData?.videos && listVideosData.videos.length > 0 ? (
        <VideoTable
          projectId={project.id}
          videos={listVideosData.videos}
          style={{marginTop: UI.spacing}}
          scroll={{y: tableHeight}}
        />
      ) : (
        <div style={{height: tableHeight, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <Empty description={intl.get('empty_project_hint')}>
            <AddVideoButton projectId={project.id} />
          </Empty>
        </div>
      )}

      <VideoFormModal />
      <ProjectFormModal />
      <ProjectExportModal
        id={project.id}
        open={showExport}
        onFinish={() => setShowExport(false)}
        onCancel={() => setShowExport(false)}
      />
      <Drawer
        title={intl.get('project.spec')}
        open={showSpec}
        onClose={() => setShowSpec(false)}
        extra={
          (spec.categories?.length ?? 0) > 0 && (
            <Button type="primary" onClick={() => window.open('/docs/concept#project', '_blank')} size="small">
              {intl.get('check_doc')}
            </Button>
          )
        }
      >
        {(spec.categories?.length ?? 0) > 0 ? (
          <>
            <Title level={5}>{intl.get('categories')}</Title>
            <Tree
              checkable={false}
              selectable={false}
              treeData={spec.categories?.map(cat => ({
                key: cat.name,
                title: (
                  <Space>
                    {cat.name}
                    {cat.multiple && <Tag color="orange">{intl.get('multiple')}</Tag>}
                    {cat.slicewise && <Tag color="orange">{intl.get('slicewise')}</Tag>}
                  </Space>
                ),
                children: cat.entries.map(ent => makeTreeNode(ent, cat.name)),
              }))}
            />
          </>
        ) : (
          <Result
            style={{padding: 0}}
            title={intl.get('project_empty_spec_hint')}
            extra={
              <Button type="primary" onClick={() => window.open('/docs/concept#project', '_blank')}>
                {intl.get('check_doc')}
              </Button>
            }
          />
        )}
      </Drawer>
    </div>
  );
};

const DetailLoad: FC<{id: Project['id']}> = ({id}) => {
  const client = useContext(NutshClientContext);

  // server state
  const {isFetching, data} = useGetProject(client, id);

  return (
    <PageLayout loading={isFetching}>
      {data && <DetailReady project={data.project} spec={data.projectSpec} />}
    </PageLayout>
  );
};

const Detail: FC = () => {
  const {projectId: id = ''} = useParams();
  if (!id) {
    return <div />;
  }

  return <DetailLoad id={id} />;
};

export default Detail;
