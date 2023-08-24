import {FC, createRef, forwardRef, useContext, useEffect, useState} from 'react';
import intl from 'react-intl-universal';
import {Alert, Spin, Modal, Form, FormProps, FormInstance, ModalProps, Select} from 'antd';

import {useExportProject} from 'state/server/project';

import {NutshClientContext} from 'common/context';
import {VideoAnnotation} from 'common/project';
import {downloadFile} from 'common/io';

import {mustDecodeJsonStr} from 'type/annotation';

import type {ExportProjectResp, Project} from 'openapi/nutsh';
import type {ProjectSpec} from 'type/project_spec';

import type {Format as Nutsh} from 'type/serialization';
import {mustConvert as mustConvertNutsh} from 'common/project/nutsh/export';

const {Option} = Select;

enum Format {
  Nutsh = 'Nutsh',
}

type FormatSpec<T> = {
  name: string;
  url: string;
  mustConvert: (projectSpec: ProjectSpec, videoAnnos: VideoAnnotation[]) => T;
};

const FormatNutsh: FormatSpec<Nutsh> = {
  name: 'Nutsh',
  url: '/docs/serialization',
  mustConvert: mustConvertNutsh,
};

const FormatSpecs = {
  [Format.Nutsh]: FormatNutsh,
};

function mustExportProject<T>(spec: FormatSpec<T>, exportProject: ExportProjectResp, projectSpec: ProjectSpec): string {
  const {videos, annotations} = exportProject;

  const videoAnnos = videos.map(v => {
    const annoJson = annotations[v.name] ?? '';
    const annotation = annoJson ? mustDecodeJsonStr(annoJson) : undefined;
    return {
      video: {name: v.name},
      frameUrls: v.frame_urls,
      annotation,
    };
  });

  const converted = spec.mustConvert(projectSpec, videoAnnos);
  return JSON.stringify(converted);
}

const ExportForm = forwardRef<
  FormInstance,
  FormProps & {
    id: Project['id'];
    onSuccess: (project: Project, content: string) => void;
  }
>(({id, onSuccess}, ref) => {
  const client = useContext(NutshClientContext);

  const {isFetching: isExporting, refetch: exportProject, data} = useExportProject(client, id);
  const [format, setFormat] = useState<Format | undefined>(undefined);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!data || !format) return;
    const {project, projectSpec} = data;

    let fileContent = '';
    try {
      switch (format) {
        case Format.Nutsh:
          fileContent = mustExportProject(FormatNutsh, data, projectSpec);
          break;
      }
      onSuccess(project, fileContent);
    } catch (e) {
      console.error(e);
      setError(true);
    }
  }, [data, format, onSuccess]);

  return (
    <Spin spinning={isExporting}>
      <Form
        ref={ref}
        layout="vertical"
        initialValues={{format: Format.Nutsh}}
        onFinish={values => {
          const format: Format = values['format'];
          setFormat(format);
          exportProject();
        }}
      >
        {error && (
          <Form.Item>
            <Alert
              showIcon={true}
              type="error"
              message={intl.get('error.unknown')}
              description={intl.get('please_check_the_console_log')}
            />
          </Form.Item>
        )}
        <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.format !== currentValues.format}>
          {({getFieldValue}) => {
            const format: Format = getFieldValue('format');
            const spec = FormatSpecs[format];
            return (
              <Form.Item
                name="format"
                label={intl.get('project.configuration.format')}
                rules={[{required: true, message: intl.get('this_field_is_required')}]}
                extra={intl.getHTML('project.export.hint', {url: spec.url, title: spec.name})}
              >
                <Select>
                  <Option value={Format.Nutsh}>{FormatSpecs[Format.Nutsh].name}</Option>
                </Select>
              </Form.Item>
            );
          }}
        </Form.Item>
      </Form>
    </Spin>
  );
});

const ExportModal: FC<ModalProps & {id: Project['id']; onFinish: () => void; onCancel: () => void}> = ({
  id,
  onFinish,
  onCancel,
  open,
  ...modalProps
}) => {
  const formRef = createRef<FormInstance>();

  return (
    <Modal
      title={intl.get('export_project')}
      open={open}
      destroyOnClose={true}
      onOk={() => formRef.current?.submit()}
      onCancel={onCancel}
      {...modalProps}
    >
      <ExportForm
        ref={formRef}
        id={id}
        onSuccess={(project, fileContent) => {
          downloadFile(fileContent, `${project.name}.json`, 'application/json');
          onFinish();
        }}
      />
    </Modal>
  );
};

export {ExportModal};
