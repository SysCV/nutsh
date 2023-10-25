import {FC, useContext, useEffect} from 'react';
import * as jsonmergepatch from 'json-merge-patch';
import {produce} from 'immer';

import {deleteAnnotationComponent, useStore as useAnnoStore} from 'state/annotate/annotation';
import {useStore as useRenderStore} from 'state/annotate/render';
import {usePatchVideoAnnotation} from 'state/server/annotation';
import {useStore as useUIStore} from 'state/annotate/ui';

import {ConfigContext, NutshClientContext} from 'common/context';
import {ApiError} from 'openapi/nutsh';

import type {Video} from 'openapi/nutsh';
import {Annotation} from 'type/annotation';

export const MonitorAnnotation: FC<{videoId: Video['id']}> = ({videoId}) => {
  const config = useContext(ConfigContext);
  return (
    <>
      {!config.readonly && <SyncAnnotation videoId={videoId} />}
      <ForgetEntities />
      <CommitDraft />
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
        const newPrev = produce(prev, removeDraftComponents);
        const newCurr = produce(curr, removeDraftComponents);

        const mergePatch = jsonmergepatch.generate(newPrev, newCurr);
        if (!mergePatch) {
          return;
        }
        console.debug('syncing annotation');

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

const CommitDraft: FC = () => {
  const commitDraftComponents = useAnnoStore(s => s.commitDraftComponents);
  const trackingCount = useUIStore(s => Object.keys(s.tracking).length);
  useEffect(() => {
    if (trackingCount === 0) {
      console.debug('commit draft components');
      commitDraftComponents();
    }
  }, [commitDraftComponents, trackingCount]);
  return <></>;
};

function removeDraftComponents(anno: Annotation): Annotation {
  return produce(anno, draft => {
    Object.values(draft.entities).forEach(entity => {
      Object.entries(entity.geometry.slices).forEach(([sidx, sliceComponents]) => {
        Object.values(sliceComponents).forEach(component => {
          if (component.draft) {
            deleteAnnotationComponent(draft, parseInt(sidx), entity.id, component.id);
          }
        });
      });
    });
    return draft;
  });
}
