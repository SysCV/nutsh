/** @jsxImportSource @emotion/react */

import {FC, createRef, forwardRef, useCallback, useContext, useState} from 'react';
import intl from 'react-intl-universal';
import {Alert, Modal, Form, FormProps, Input, Space, Collapse, Button, FormInstance} from 'antd';
import {QuestionCircleOutlined, SelectOutlined} from '@ant-design/icons';
import {css} from '@emotion/react';

import {useStore} from 'state/client/store';
import {useCreateProject, useUpdateProject} from 'state/server/project';

import {checkBadRequest} from 'common/network';
import {NutshClientContext} from 'common/context';

import {ProjectSpec, mustDecodeJsonStr as mustDecodeSpecJsonStr} from 'type/project_spec';
import type {Category, Entry} from 'type/project_spec';

import sampleProjectSpecJson from './sampleProjectSpec.json';

const {TextArea} = Input;

function collectEntryLeafs(entry: Entry): Entry[] {
  return entry.subentries?.map(collectEntryLeafs).flat() ?? [entry];
}

export function collectCategoryLeafs(cat: Category): Entry[] {
  return cat.entries.map(collectEntryLeafs).flat();
}

const entryRgx = /^([A-Za-z]|[0-9]|_|-|\s)+$/;
const specDocUrl = '/docs/concept#project';
const specTextAreaPlaceholder = `{
  "categories": [
    {
      "name": "...",
      "multiple": false,
      "entries": [
        {
          "name": "...",
          "subentries": [
            { "name": "..." },
            { "name": "..." },
            {
              "name": "...",
              "subentries": [{ "name": "..." }, { "name": "..." }]
            }
          ]
        },
        {
          "name": "...",
          "subentries": [{ "name": "..." }, { "name": "..." }, { "name": "..." }]
        }
      ]
    },
    {
      "name": "...",
      "multiple": true,
      "slicewise": true,
      "entries": [{ "name": "..." }, { "name": "..." }, { "name": "..." }, { "name": "..." }]
    }
  ]
}`;

function checkSpecJson(specJson: string): string {
  if (!specJson) {
    return '';
  }

  let spec: ProjectSpec = {};
  try {
    spec = mustDecodeSpecJsonStr(specJson);
  } catch (e) {
    console.error(e);
    return intl.getHTML('project_form.error.invalid_project_spec_json', {url: specDocUrl});
  }

  // All leaf entries have unique names across ALL categories and does contain only alphabetical characters.
  const entryValues = new Set<string>();
  for (const cat of spec.categories ?? []) {
    const es = collectCategoryLeafs(cat);
    for (const e of es) {
      if (entryValues.has(e.name)) {
        return intl.get('error.project_category_duplicated_entry', {value: e.name});
      }
      if (!entryRgx.test(e.name)) {
        return intl.get('error.project_category_nonalphabetical_entry', {value: e.name});
      }
      entryValues.add(e.name);
    }
  }
  return '';
}

const CreateForm = forwardRef<FormInstance, FormProps>((formProps, ref) => {
  const [form] = Form.useForm();
  return (
    <Form ref={ref} form={form} layout="vertical" {...formProps}>
      <Form.Item
        name="name"
        label={intl.get('project.name')}
        rules={[{required: true, message: intl.get('this_field_is_required')}]}
        extra={intl.get('project_form.name_extra')}
      >
        <Input />
      </Form.Item>
      <Form.Item name="remark" label={intl.get('project.remark')} extra={intl.get('project_form.remark_extra')}>
        <Input />
      </Form.Item>
      <Collapse
        ghost={true}
        css={css`
          & .ant-collapse-header {
            padding: 0 !important;
          }
          & .ant-collapse-content-box {
            padding: 16px 0 !important;
          }
        `}
        items={[
          {
            key: 'advanced',
            label: intl.get('project_form.advanced_configuration'),
            children: (
              <Form.Item
                name="specJson"
                label={
                  <Space>
                    {intl.get('project.spec_json')}
                    <a href={specDocUrl} target="_blank" rel="noreferrer">
                      <QuestionCircleOutlined />
                    </a>
                  </Space>
                }
                extra={
                  <Space direction="vertical">
                    {intl.getHTML('project_form.specification_extra', {url: specDocUrl})}
                    <Button
                      size="small"
                      icon={<SelectOutlined />}
                      onClick={() => form?.setFieldValue('specJson', JSON.stringify(sampleProjectSpecJson, null, 4))}
                    >
                      {intl.get('project_form.sample_spec_json')}
                    </Button>
                  </Space>
                }
              >
                <TextArea rows={10} placeholder={specTextAreaPlaceholder} />
              </Form.Item>
            ),
          },
        ]}
      ></Collapse>
    </Form>
  );
});

const UpdateForm = forwardRef<FormInstance, FormProps>((formProps, ref) => {
  return (
    <Form ref={ref} layout="vertical" {...formProps}>
      <Form.Item
        name="name"
        label={intl.get('project.name')}
        rules={[{required: true, message: intl.get('this_field_is_required')}]}
        extra={intl.get('project_form.name_extra')}
      >
        <Input />
      </Form.Item>
      <Form.Item name="remark" label={intl.get('project.remark')} extra={intl.get('project_form.remark_extra')}>
        <Input />
      </Form.Item>
    </Form>
  );
});

const FormModal: FC = () => {
  const client = useContext(NutshClientContext);

  // client state
  const project = useStore(s => s.project.mutate.project);
  const isOpen = useStore(s => s.project.mutate.isMutating);
  const finish = useStore(s => s.project.mutate.finish);

  // server state
  const {mutate: create, isLoading: isCreating} = useCreateProject(client);
  const {mutate: update, isLoading: isUpdating} = useUpdateProject(client);

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
      title={intl.get(project ? 'edit_project' : 'add_project')}
      open={isOpen}
      onOk={() => form.current?.submit()}
      onCancel={finish}
      okButtonProps={{loading: isLoading, disabled: isLoading}}
      destroyOnClose={true}
      afterClose={() => setError(undefined)}
    >
      {error && (
        <Form.Item>
          <Alert showIcon={true} type="error" message={error} closable={true} onClose={() => setError(undefined)} />
        </Form.Item>
      )}
      {project ? (
        <UpdateForm
          ref={form}
          initialValues={{...project}}
          onFinish={values => {
            const {name, remark = ''} = values;

            setError(undefined);
            update({projectId: project.id, requestBody: {name, remark}}, {onSuccess: finish, onError});
          }}
        />
      ) : (
        <CreateForm
          ref={form}
          onFinish={values => {
            const {name, specJson, remark = ''} = values;

            const specJsonError = checkSpecJson(specJson);
            if (specJsonError) {
              setError(specJsonError);
              return;
            }

            setError(undefined);
            create({requestBody: {name, spec_json: specJson, remark}}, {onSuccess: finish, onError});
          }}
        />
      )}
    </Modal>
  );
};

export {FormModal};
