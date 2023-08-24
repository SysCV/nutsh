import {FC, useContext} from 'react';
import intl from 'react-intl-universal';
import {Button, Popconfirm} from 'antd';
import {DeleteOutlined} from '@ant-design/icons';
import {useDeleteVideo} from 'state/server/video';
import {ConfigContext, NutshClientContext} from 'common/context';
import type {Video} from 'openapi/nutsh';

export type Props = React.ComponentProps<typeof Button> & {
  videoId: Video['id'];
};

export const DeleteVideoButton: FC<Props> = ({videoId, ...baseProps}) => {
  const client = useContext(NutshClientContext);
  const {mutate: deleteVideo, isLoading: isDeletingVideo} = useDeleteVideo(client);

  const config = useContext(ConfigContext);

  return config.readonly ? (
    <Button
      loading={isDeletingVideo}
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
      onConfirm={() => deleteVideo({videoId})}
    >
      <Button loading={isDeletingVideo} icon={<DeleteOutlined />} type="text" {...baseProps} />
    </Popconfirm>
  );
};
