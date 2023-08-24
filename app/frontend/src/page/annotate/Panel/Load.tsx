import {FC, useContext, useEffect, useState} from 'react';
import intl from 'react-intl-universal';
import {Alert} from 'antd';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useStore as useAnnoStore} from 'state/annotate/annotation';
import {useGetVideoAnnotation} from 'state/server/annotation';
import {useGetVideo} from 'state/server/video';
import {NutshClientContext} from 'common/context';
import PageLayout from 'page/Layout';
import {mustDecodeJsonStr as mustDecodeAnnotationJsonStr} from 'type/annotation';
import type {Video} from 'openapi/nutsh';
import {PanelLoadProject} from './LoadProject';

export const PanelLoad: FC<{id: Video['id']}> = ({id}) => {
  const client = useContext(NutshClientContext);

  // client state
  const isLoaded = useRenderStore(s => s.sliceUrls.length > 0);
  const startAnnotation = useRenderStore(s => s.startAnnotation);
  const setAnnotation = useAnnoStore(s => s.setAnnotation);

  // server state
  const {isFetching: isFetchingVideo, data: getVideoData} = useGetVideo(client, id);
  const {isFetching: isFetchingAnno, data: getVideoAnnotationData} = useGetVideoAnnotation(client, id);

  // local state
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!getVideoAnnotationData) return;
    if (!getVideoData) return;

    setErrorCode(undefined);
    const {annotation_json: annoJson, annotation_version: annoVersion} = getVideoAnnotationData;
    const {frame_urls: frameUrls} = getVideoData.video;
    if (!frameUrls || frameUrls.length === 0) {
      setErrorCode('error.missing_video_frames');
      return;
    }

    try {
      const annotation = annoJson ? mustDecodeAnnotationJsonStr(annoJson) : undefined;
      setAnnotation(annotation);
      startAnnotation(frameUrls, annoVersion);
    } catch (e) {
      console.error((e as Error).cause);
      setErrorCode('error.invalid_annotation_json');
    }
  }, [getVideoData, getVideoAnnotationData, setAnnotation, startAnnotation]);

  if (!isLoaded || !getVideoData) {
    return (
      <PageLayout loading={isFetchingAnno || isFetchingVideo}>
        {errorCode && <Alert showIcon={true} type="error" message={intl.get(errorCode)} />}
      </PageLayout>
    );
  }

  return <PanelLoadProject video={getVideoData.video} />;
};
