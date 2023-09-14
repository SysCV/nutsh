import {FC, createRef, forwardRef, useCallback, useContext, useState} from 'react';
import intl from 'react-intl-universal';
import {Alert, Modal, Form, FormProps, Input, Space, Button, FormInstance} from 'antd';
import {SelectOutlined} from '@ant-design/icons';

import {useStore} from 'state/client/store';
import {useCreateVideo, useUpdateVideo} from 'state/server/video';

import {checkBadRequest} from 'common/network';
import {NutshClientContext} from 'common/context';

const {TextArea} = Input;

const frameTextAreaPlaceholder = `frame_0001_url
frame_0002_url
frame_0003_url
...`;

const sampleVideoUrlHost = 'https://nutsh-public.s3.eu-central-1.amazonaws.com/demo/video/driving';
const sampleVideoUrls = Array.from({length: 100})
  .map((_, i) => `${sampleVideoUrlHost}/intersection-${(i + 51).toString().padStart(7, '0')}.jpg`)
  .join('\n');

const CreateForm = forwardRef<FormInstance, FormProps>((formProps, ref) => {
  const [form] = Form.useForm();
  return (
    <Form ref={ref} form={form} layout="vertical" {...formProps}>
      <Form.Item
        name="name"
        label={intl.get('video.name')}
        rules={[{required: true, message: intl.get('this_field_is_required')}]}
        extra={intl.get('video_form.name_extra')}
      >
        <Input />
      </Form.Item>
      <Form.Item
        name="frameUrls"
        label={intl.get('video.frame_urls')}
        rules={[{required: true, message: intl.get('this_field_is_required')}]}
        extra={
          <Space direction="vertical">
            {intl.get('video_form.frame_extra')}
            <Button
              size="small"
              icon={<SelectOutlined />}
              onClick={() => form.setFieldValue('frameUrls', sampleVideoUrls)}
            >
              {intl.get('video_form.sample_video')}
            </Button>
          </Space>
        }
      >
        <TextArea rows={10} placeholder={frameTextAreaPlaceholder} />
      </Form.Item>
    </Form>
  );
});

const UpdateForm = forwardRef<FormInstance, FormProps>((formProps, ref) => {
  return (
    <Form ref={ref} layout="vertical" {...formProps}>
      <Form.Item
        name="name"
        label={intl.get('video.name')}
        rules={[{required: true, message: intl.get('this_field_is_required')}]}
      >
        <Input />
      </Form.Item>
    </Form>
  );
});

const FormModal: FC = () => {
  const client = useContext(NutshClientContext);

  // client state
  const projectId = useStore(s => s.video.mutate.creatingProjectId);
  const video = useStore(s => s.video.mutate.updatingVideo);
  const finish = useStore(s => s.video.mutate.finish);

  // client state
  const cancelCreateVideo = useStore(s => s.video.mutate.finish);

  // server state
  const {mutate: create, isLoading: isCreating} = useCreateVideo(client);
  const {mutate: update, isLoading: isUpdating} = useUpdateVideo(client);

  // error
  const [error, setError] = useState<string | undefined>(undefined);
  const onError = useCallback((err: unknown) => {
    const errorCode = checkBadRequest(err);
    setError(errorCode ? intl.get(`error.${errorCode}`) : undefined);
  }, []);

  // form
  const form = createRef<FormInstance>();

  const isLoading = isCreating || isUpdating;

  return (
    <Modal
      title={intl.get(video ? 'edit_video' : 'add_video')}
      open={projectId !== undefined || video !== undefined}
      onOk={() => form.current?.submit()}
      onCancel={cancelCreateVideo}
      okButtonProps={{loading: isLoading, disabled: isLoading}}
      destroyOnClose={true}
      afterClose={() => setError(undefined)}
    >
      {error && (
        <Form.Item>
          <Alert showIcon={true} type="error" message={error} closable={true} onClose={() => setError(undefined)} />
        </Form.Item>
      )}

      {projectId && (
        <CreateForm
          ref={form}
          onFinish={values => {
            const {name, frameUrls} = values;
            const project_id = projectId;
            const frame_urls = frameUrls.trim().split('\n');
            create({requestBody: {name, project_id, frame_urls}}, {onSuccess: finish, onError});
          }}
        />
      )}
      {video && (
        <UpdateForm
          ref={form}
          initialValues={{...video}}
          onFinish={values => {
            const {name} = values;
            update({videoId: video.id, requestBody: {name}}, {onSuccess: finish, onError});
          }}
        />
      )}
    </Modal>
  );
};

export {FormModal};
