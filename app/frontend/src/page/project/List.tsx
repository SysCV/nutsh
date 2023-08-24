import {FC, useContext} from 'react';
import intl from 'react-intl-universal';
import {useWindowHeight} from '@react-hook/window-size';
import {Button, Empty, Skeleton, Space} from 'antd';
import {PlusOutlined, UploadOutlined} from '@ant-design/icons';
import PageLayout from 'page/Layout';
import {ImportModal as ImportProjectModal} from 'component/resource/ImportProject';
import {FormModal as ProjectFormModal} from 'component/resource/MutateProject';
import {ProjectTable} from 'component/resource/ProjectTable';
import {useStore} from 'state/client/store';
import {UI} from 'common/constant';
import {ConfigContext, NutshClientContext} from 'common/context';
import {useListProjects} from 'state/server/project';

const List: FC = () => {
  const config = useContext(ConfigContext);
  const client = useContext(NutshClientContext);

  const {isFetching: isListingProjects, data: listProjectsData} = useListProjects(client);

  const addProject = useStore(s => s.project.mutate.startCreate);
  const importProject = useStore(s => s.project.mutate.startImport);
  const winHeight = useWindowHeight();
  const tableHeight = winHeight - UI.navbarHeight - UI.spacing * 2 /* margins */ - 65; /* table header */

  return (
    <PageLayout>
      {isListingProjects ? (
        <Skeleton active={true} />
      ) : listProjectsData?.projects && listProjectsData.projects.length > 0 ? (
        <ProjectTable projects={listProjectsData.projects} scroll={{y: tableHeight}} />
      ) : (
        <div style={{height: tableHeight, display: 'flex', justifyContent: 'center', alignItems: 'center'}}>
          <Empty description={intl.get('no_project_hint')}>
            <Space>
              <Button
                type="primary"
                onClick={addProject}
                icon={<PlusOutlined />}
                disabled={config.readonly}
                title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
              >
                {intl.get('add_project')}
              </Button>
              <Button
                type="primary"
                onClick={importProject}
                icon={<UploadOutlined />}
                disabled={config.readonly}
                title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
              >
                {intl.get('import_project')}
              </Button>
            </Space>
          </Empty>
        </div>
      )}

      <ProjectFormModal />
      <ImportProjectModal />
    </PageLayout>
  );
};

export default List;
