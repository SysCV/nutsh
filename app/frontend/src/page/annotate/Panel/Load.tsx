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
import {useJoinYjs} from '@@frontend/state/server/annotation';

export const PanelLoad: FC<{id: Video['id']}> = ({id}) => {
  const client = useContext(NutshClientContext);

  // client state
  const isLoaded = useRenderStore(s => s.sliceUrls.length > 0);
  const startAnnotation = useRenderStore(s => s.startAnnotation);
  const setAnnotation = useAnnoStore(s => s.setAnnotation);

  // server state
  const {isFetching: isFetchingVideo, data: videoData} = useGetVideo(client, id);

  // yjs
  useJoinYjs(id);

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
  }, [videoData, setAnnotation, startAnnotation]);

  if (!isLoaded || !videoData) {
    return (
      <PageLayout loading={isFetchingVideo}>
        {errorCode && <Alert showIcon={true} type="error" message={intl.get(errorCode)} />}
      </PageLayout>
    );
  }

  return <PanelLoadProject video={videoData.video} />;
};
