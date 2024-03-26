import {FC, useContext, useEffect, useState} from 'react';
import intl from 'react-intl-universal';
import {Alert} from 'antd';
import {useStore as useRenderStore} from 'state/annotate/render';
import {useAnnoStore} from 'state/annotate/annotation-provider';
import {useGetVideo} from 'state/server/video';
import {NutshClientContext} from 'common/context';
import PageLayout from 'page/Layout';
import type {Video} from 'openapi/nutsh';
import {PanelLoadProject} from './LoadProject';
import {useAnnotationSync} from '@@frontend/state/server/annotation';

export const PanelLoad: FC<{id: Video['id']}> = ({id}) => {
  const client = useContext(NutshClientContext);

  // client state
  const isLoaded = useRenderStore(s => s.sliceUrls.length > 0);
  const startAnnotation = useRenderStore(s => s.startAnnotation);

  // server state
  const {isFetching: isFetchingVideo, data: videoData} = useGetVideo(client, id);

  // sync
  const {initial} = useAnnotationSync(id);
  const setAnnotation = useAnnoStore(s => s.setAnnotation);
  useEffect(() => {
    if (initial) {
      setAnnotation(initial);
    }
  }, [initial, setAnnotation]);

  // local state
  const [errorCode, setErrorCode] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!videoData) return;

    setErrorCode(undefined);
    const {frame_urls: frameUrls} = videoData.video;
    if (!frameUrls || frameUrls.length === 0) {
      setErrorCode('error.missing_video_frames');
      return;
    }

    startAnnotation(frameUrls, '');
  }, [videoData, startAnnotation]);

  if (!isLoaded || !videoData || initial === undefined || errorCode) {
    return (
      <PageLayout loading={isFetchingVideo || initial === undefined}>
        {errorCode && <Alert showIcon={true} type="error" message={intl.get(errorCode)} />}
      </PageLayout>
    );
  }

  // Only AFTER the annotation is initialized should we render the panel, otherwise its yjs update listener will respond
  // to the initialization, causing the page to re-render frequently and impossible to load heavy annotations.
  return <PanelLoadProject video={videoData.video} />;
};
