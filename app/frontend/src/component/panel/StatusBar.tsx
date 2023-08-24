import {FC, useContext, useEffect, useMemo} from 'react';
import intl from 'react-intl-universal';
import {Link} from 'react-router-dom';

import {Tag, Breadcrumb, Button, Spin, Popover, Descriptions, Switch, Space, Typography} from 'antd';
import {SettingOutlined} from '@ant-design/icons';

import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useDrawPolyStore} from 'state/annotate/polychain/draw';

import {routePath} from 'common/route';
import {UI} from 'common/constant';
import {ConfigContext, NutshClientContext} from 'common/context';

import type {Project, Video} from 'openapi/nutsh';
import {emitter} from 'event';
import {useCreateProjectSample} from 'state/server/sample';
import {Sample} from 'proto/schema/v1/train_pb';
import {useKeyPressed} from 'common/keyboard';

const {Text} = Typography;

export type Props = React.ComponentProps<'div'> & {
  video: Video;
  project: Project;
};

const Setting: FC = () => {
  const showSummary = useRenderStore(s => s.showSummary);
  const setShowSummary = useRenderStore(s => s.setShowSummary);

  return (
    <Descriptions column={1} style={{width: 240}} bordered={true} size="small">
      <Descriptions.Item label={intl.get('setting.show_summary')}>
        <Switch checked={showSummary} onChange={checked => setShowSummary(checked)} />
      </Descriptions.Item>
    </Descriptions>
  );
};

export const StatusBar: FC<Props> = ({video, project, ...baseProps}) => {
  const {readonly} = useContext(ConfigContext);

  const sliceSize = useRenderStore(s => s.sliceSize);
  const sliceIndex = useRenderStore(s => s.sliceIndex);
  const sliceUrl = useMemo(() => (video.frame_urls ?? [])[sliceIndex], [sliceIndex, video.frame_urls]);
  const segmentCloneStep = useRenderStore(s => s.segmentClone.vertexIndices.length);

  const manipulatingType = useRenderStore(s => s.manipulate.data?.type);
  const stopManipulating = useRenderStore(s => s.manipulate.stop);

  const isSyncing = useRenderStore(s => s.isSyncing);
  const isQPressed = useKeyPressed('q');
  const isDrawingPoly = useDrawPolyStore(s => s.vertices.length > 0);

  // event
  const client = useContext(NutshClientContext);
  const {mutate: createProjectSample, isLoading: isCreatingProjectSample} = useCreateProjectSample(client);
  useEffect(() => {
    return emitter.on('segmentationSampleCreated', segmentation => {
      if (readonly) return;
      const s = new Sample({
        imageUrl: sliceUrl,
        segmentation,
      });
      createProjectSample({projectId: video.project_id, requestBody: {sample_json: JSON.stringify(s)}});
    });
  }, [readonly, createProjectSample, sliceUrl, video.project_id]);

  return (
    <div {...baseProps}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          padding: `0 ${UI.spacing}px`,
          gap: UI.spacing,
        }}
      >
        <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center'}}>
          <Breadcrumb
            items={[
              {
                title: <Link to={routePath(`/project/${project.id}`)}>{project.name}</Link>,
              },
              {
                title: video.name,
              },
              {
                title: (
                  <span>
                    {intl.get('frame')} {sliceIndex + 1}
                  </span>
                ),
              },
            ]}
          />
          <Spin
            spinning={isSyncing || isCreatingProjectSample}
            size="small"
            style={{marginLeft: UI.spacing, height: 16}}
          />
        </div>
        <div
          style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'center',
          }}
        >
          {isDrawingPoly && isQPressed && (
            <Tag color="warning">{intl.get('segment_clone_step', {step: segmentCloneStep})}</Tag>
          )}
          {!!manipulatingType && (
            <Tag color="warning" closable={true} onClose={() => stopManipulating()}>
              {intl.get(
                manipulatingType === 'transfer'
                  ? 'click_the_target_entity'
                  : 'click_the_target_component_to_interpolate'
              )}
            </Tag>
          )}
        </div>
        <Space>
          {sliceSize && (
            <Text type="secondary">
              {sliceSize.width}x{sliceSize.height}
            </Text>
          )}
          <Popover content={<Setting />} trigger="hover" placement="topRight">
            <Button icon={<SettingOutlined />} type="text" />
          </Popover>
        </Space>
      </div>
    </div>
  );
};
