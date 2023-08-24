/** @jsxImportSource @emotion/react */

import React, {FC, useState, useContext, useCallback, useEffect, createRef, forwardRef} from 'react';
import create from 'zustand';
import {immer} from 'zustand/middleware/immer';
import intl from 'react-intl-universal';
import {
  Alert,
  Modal,
  Form,
  FormProps,
  Upload,
  ModalProps,
  Select,
  Spin,
  Input,
  Checkbox,
  FormInstance,
  Collapse,
} from 'antd';
import {RcFile} from 'antd/es/upload';
import {UploadOutlined} from '@ant-design/icons';
import {css} from '@emotion/react';

import {useStore} from 'state/client/store';
import {useImportProject} from 'state/server/project';

import {ImportProjectReq} from 'openapi/nutsh';
import {checkBadRequest} from 'common/network';
import {NutshClientContext} from 'common/context';
import {decodeFile} from 'common/io';

import {Format as Nutsh, mustDecodeJsonStr as mustDecodeNutshJsonStr} from 'type/serialization';
import {mustConvert as mustConvertNutsh} from 'common/project/nutsh/import';

import {Format as Scalabel, mustDecodeJsonStr as mustDecodeScalabelJsonStr} from 'type/scalabel';
import {mustConvert as mustConvertScalabel} from 'common/project/scalabel/import';
import {ProjectForm} from 'type/app';
import {ImportProjectDownload, Reason} from './ImportProjectDownload';

const {Dragger} = Upload;
const {Option} = Select;

enum Format {
  Nutsh = 'Nutsh',
  Scalabel = 'Scalabel',
}

type FormatSpec<T> = {
  name: string;
  url: string;
  decode: (file: RcFile) => Promise<T>;
  mustConvert: (decoded: T, form: ProjectForm) => Promise<ImportProjectReq>;
};

const FormatNutsh: FormatSpec<Nutsh> = {
  name: 'Nutsh',
  url: '/docs/serialization',
  decode: (file: RcFile) => decodeFile<Nutsh>(file, mustDecodeNutshJsonStr),
  mustConvert: mustConvertNutsh,
};

const FormatScalabel: FormatSpec<Scalabel> = {
  name: 'Scalabel',
  url: 'https://doc.scalabel.ai/format.html#exporting-format',
  decode: (file: RcFile) => decodeFile<Scalabel>(file, mustDecodeScalabelJsonStr),
  mustConvert: mustConvertScalabel,
};

const FormatSpecs = {
  [Format.Nutsh]: FormatNutsh,
  [Format.Scalabel]: FormatScalabel,
};

type LocalState = {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;

  download: {req: ImportProjectReq; reason: Reason} | undefined;
  setDownload: (download: {req: ImportProjectReq; reason: Reason} | undefined) => void;
};

const useLocalStore = create<LocalState>()(
  immer<LocalState>(set => ({
    isLoading: false,
    setLoading: (isLoading: boolean) => {
      set(s => {
        s.isLoading = isLoading;
      });
    },

    download: undefined,
    setDownload: (download: {req: ImportProjectReq; reason: Reason} | undefined) => {
      set(s => {
        s.download = download;
      });
    },
  }))
);

const ImportForm = forwardRef<FormInstance, FormProps & {onFinish: () => void}>(({onFinish, ...formProps}, ref) => {
  const client = useContext(NutshClientContext);

  const [file, setFile] = useState<RcFile | undefined>(undefined);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [fileError, setFileError] = useState<React.ReactNode | undefined>(undefined);
  const [convertError, setConvertError] = useState<boolean>(false);
  const {mutate: importProject, isLoading: isImporting, error: importProjectError} = useImportProject(client);

  const setLoading = useLocalStore(s => s.setLoading);
  useEffect(() => setLoading(isProcessing || isImporting), [isImporting, isProcessing, setLoading]);

  const [req, setReq] = useState<ImportProjectReq | undefined>(undefined);
  useEffect(() => {
    if (req) {
      importProject({requestBody: req}, {onSuccess: onFinish});
    }
  }, [importProject, onFinish, req]);

  // Check if an OOM error occurs
  const setDownload = useLocalStore(s => s.setDownload);
  useEffect(() => {
    const e = importProjectError;
    if (!e || !req) {
      return;
    }
    if (e instanceof RangeError) {
      if (e.name === 'RangeError' && e.message === 'Invalid string length') {
        setDownload({req, reason: 'oom'});
      }
    }
  }, [importProjectError, req, setDownload]);

  const [form] = Form.useForm();
  const manual = Form.useWatch('manual', form);

  const process = useCallback(
    <T extends object>(spec: FormatSpec<T>, form: ProjectForm) => {
      if (!file) {
        setFileError(intl.get('this_field_is_required'));
        return;
      }
      setIsProcessing(true);
      spec
        .decode(file)
        .then(decoded => {
          const {name, remark = ''} = form;
          try {
            spec
              .mustConvert(decoded, {name, remark})
              .then(req => (manual ? setDownload({req, reason: 'manual'}) : setReq(req)))
              .finally(() => setIsProcessing(false));
          } catch (e) {
            console.error(e);
            setConvertError(true);
            setIsProcessing(false);
          }
        })
        .catch(errCode => {
          setFileError(intl.get(errCode));
          setIsProcessing(false);
        });
    },
    [file, manual, setDownload]
  );

  return (
    <Form
      ref={ref}
      form={form}
      layout="vertical"
      initialValues={{format: Format.Nutsh}}
      onFinish={values => {
        const format: Format = values['format'];
        switch (format) {
          case Format.Nutsh:
            process(FormatNutsh, values);
            break;
          case Format.Scalabel:
            process(FormatScalabel, values);
            break;
        }
      }}
      {...formProps}
    >
      {convertError ? (
        <Form.Item>
          <Alert
            showIcon={true}
            type="error"
            message={intl.get('error.unknown')}
            description={intl.get('please_check_the_console_log')}
          />
        </Form.Item>
      ) : importProjectError ? (
        <Form.Item>
          <Alert showIcon={true} type="error" message={intl.get(`error.${checkBadRequest(importProjectError)}`)} />
        </Form.Item>
      ) : null}
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
      <Form.Item
        name="format"
        label={intl.get('project.configuration.format')}
        rules={[
          {
            required: true,
            message: intl.get('this_field_is_required'),
          },
        ]}
      >
        <Select>
          <Option value={Format.Nutsh}>{FormatSpecs[Format.Nutsh].name}</Option>
          <Option value={Format.Scalabel}>{FormatSpecs[Format.Scalabel].name}</Option>
        </Select>
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.format !== currentValues.format}>
        {({getFieldValue}) => {
          const format: Format = getFieldValue('format');
          const spec = FormatSpecs[format];
          return (
            <>
              <Form.Item
                validateStatus={fileError ? 'error' : undefined}
                help={fileError}
                extra={intl.getHTML('project.import.hint', {url: spec.url, title: spec.name})}
              >
                <Dragger
                  name="file"
                  multiple={false}
                  accept="application/json"
                  fileList={file ? [file] : []}
                  onRemove={() => setFile(undefined)}
                  beforeUpload={file => {
                    setFileError(undefined);
                    setFile(file);
                    return false;
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <UploadOutlined />
                  </p>
                  {intl.get('project.import.text')}
                </Dragger>
              </Form.Item>
              {spec.name === 'Nutsh' && (
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
                          name="manual"
                          extra={intl.get('project_form.manual_import_extra')}
                          valuePropName="checked"
                        >
                          <Checkbox>{intl.get('project_form.manual_import')}</Checkbox>
                        </Form.Item>
                      ),
                    },
                  ]}
                ></Collapse>
              )}
            </>
          );
        }}
      </Form.Item>
    </Form>
  );
});

const ImportModal: FC<ModalProps> = ({...modalProps}) => {
  const isOpen = useStore(s => s.project.mutate.isImporting);
  const finish = useStore(s => s.project.mutate.finish);

  const isLoading = useLocalStore(s => s.isLoading);
  const download = useLocalStore(s => s.download);
  const setDownload = useLocalStore(s => s.setDownload);

  // form
  const form = createRef<FormInstance>();

  return (
    <Modal
      title={intl.get('import_project')}
      destroyOnClose={true}
      onOk={() => form.current?.submit()}
      okButtonProps={{disabled: isLoading, style: {display: download ? 'none' : undefined}}}
      cancelText={download ? intl.get('close') : undefined}
      onCancel={finish}
      open={isOpen}
      afterClose={() => setDownload(undefined)}
      {...modalProps}
    >
      {download ? (
        <ImportProjectDownload request={download.req} reason={download.reason} />
      ) : (
        <Spin spinning={isLoading}>
          <ImportForm ref={form} onFinish={finish} />
        </Spin>
      )}
    </Modal>
  );
};

export {ImportModal};
