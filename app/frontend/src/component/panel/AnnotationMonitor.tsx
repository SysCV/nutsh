import {FC, useContext, useEffect} from 'react';
import * as jsonmergepatch from 'json-merge-patch';

import {useStore as useAnnoStore} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';
import {usePatchVideoAnnotation} from 'state/server/annotation';

import {ConfigContext, NutshClientContext} from 'common/context';
import {ApiError} from 'openapi/nutsh';

import type {Video} from 'openapi/nutsh';

export const MonitorAnnotation: FC<{videoId: Video['id']}> = ({videoId}) => {
  const config = useContext(ConfigContext);
  return (
    <>
      {!config.readonly && <SyncAnnotation videoId={videoId} />}
      <ForgetEntities />
    </>
  );
};

const SyncAnnotation: FC<{videoId: Video['id']}> = ({videoId}) => {
  const client = useContext(NutshClientContext);
  const annotationVersion = useRenderStore(s => s.annotationVersion);
  const isSyncing = useRenderStore(s => s.isSyncing);
  const setAnnotationVersion = useRenderStore(s => s.setAnnotationVersion);
  const setIsSyncing = useRenderStore(s => s.setIsSyncing);
  const setSyncError = useRenderStore(s => s.setSyncError);

  // sync with server when annotation changes
  const {mutate: patchVideoAnnotation, error} = usePatchVideoAnnotation(client);

  useEffect(() => {
    return useAnnoStore.subscribe(
      s => s.annotation,
      (curr, prev) => {
        const mergePatch = jsonmergepatch.generate(prev, curr);
        if (!mergePatch) {
          return;
        }

        if (isSyncing) {
          setSyncError('error.sync.conflict');
          return;
        }
        setIsSyncing(true);
        patchVideoAnnotation(
          {
            videoId,
            requestBody: {
              json_merge_patch: JSON.stringify(mergePatch),
              annotation_version: annotationVersion,
            },
          },
          {
            onSuccess: ({annotation_version}) => {
              setAnnotationVersion(annotation_version);
              setIsSyncing(false);
            },
          }
        );
      },
      {
        fireImmediately: true,
      }
    );
  }, [videoId, annotationVersion, isSyncing, setAnnotationVersion, setIsSyncing, patchVideoAnnotation, setSyncError]);

  useEffect(() => {
    if (error) {
      if (error instanceof ApiError) {
        if (error.status === 409) {
          setSyncError('error.sync.conflict');
          return;
        }
      }
      setSyncError('error.sync.unknown');
    }
  }, [error, setSyncError]);

  return <></>;
};

const ForgetEntities: FC = () => {
  const forgetEntities = useRenderStore(s => s.forgetEntities);
  useEffect(() => {
    return useAnnoStore.subscribe(
      s => s.annotation,
      (curr, prev) => {
        const goneEntityIds = Object.keys(prev.entities).filter(eid => !(eid in curr.entities));
        if (goneEntityIds.length > 0) {
          forgetEntities(...goneEntityIds);
        }
      }
    );
  }, [forgetEntities]);
  return <></>;
};
