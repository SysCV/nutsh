import {FC, useContext} from 'react';
import intl from 'react-intl-universal';
import {Button, Popconfirm} from 'antd';
import {DeleteOutlined} from '@ant-design/icons';
import {useDeleteProject} from 'state/server/project';
import {ConfigContext, NutshClientContext} from 'common/context';
import type {Video} from 'openapi/nutsh';

export type Props = React.ComponentProps<typeof Button> & {
  projectId: Video['id'];
};

export const DeleteProjectButton: FC<Props> = ({projectId, ...baseProps}) => {
  const client = useContext(NutshClientContext);
  const {mutate: deleteProject, isLoading: isDeletingProject} = useDeleteProject(client);

  const config = useContext(ConfigContext);

  return config.readonly ? (
    <Button
      loading={isDeletingProject}
      icon={<DeleteOutlined />}
      type="text"
      disabled={config.readonly}
      title={config.readonly ? intl.get('disabled_in_readonly_mode') : undefined}
      {...baseProps}
    />
  ) : (
    <Popconfirm
      key="delete"
      placement="left"
      title={intl.get('are_you_sure')}
      okButtonProps={{danger: true}}
      onConfirm={() => deleteProject({projectId})}
    >
      <Button loading={isDeletingProject} icon={<DeleteOutlined />} type="text" {...baseProps} />
    </Popconfirm>
  );
};
