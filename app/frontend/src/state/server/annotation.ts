import {useQuery, useMutation} from '@tanstack/react-query';
import {NutshClientContext} from 'common/context';
import {useYjsContext} from 'common/yjs/context';
import {writeAnnotationToYjs, readAnnotationFromYjs} from 'common/yjs/convert';
import type {NutshClient, DefaultService, Video} from 'openapi/nutsh';
import {mustDecodeJsonStr as mustDecodeAnnotationJsonStr} from 'type/annotation';
import {useContext} from 'react';
import {WebsocketProvider} from 'y-websocket';

/**
 * @deprecated Use `useGetVideoAnnotationYjs`.
 */
export const useGetVideoAnnotation = (client: NutshClient, id: Video['id']) =>
  useQuery({
    queryKey: ['getVideoAnnotation', id],
    queryFn: () => client.default.getVideoAnnotation({videoId: id}),
  });

/**
 * @deprecated Synchronization will go throgh Yjs.
 */
export const usePatchVideoAnnotation = (client: NutshClient) => {
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['patchVideoAnnotation']>[0]) =>
      client.default.patchVideoAnnotation(req),
  });
};

export const useGetVideoAnnotationYjs = (id: Video['id']) => {
  const {doc} = useYjsContext();
  const client = useContext(NutshClientContext);
  return useQuery({
    queryKey: ['getVideoAnnotationV2', id],
    queryFn: async () => {
      // connect to the yjs server
      const origin = wsOrigin();
      const provider = new WebsocketProvider(origin, `ws/video/${id}`, doc);

      // reconstruct the initial annotation
      const annoJson = await new Promise<string>(resolve => {
        provider.on('synced', async (isSynced: boolean) => {
          if (!isSynced) {
            return;
          }
          let anno = readAnnotationFromYjs(doc);

          if (Object.keys(anno.entities).length === 0) {
            console.warn('try to read and convert old annotation');

            // For backward-compatibity, if the annotation is empty, we fetch using the old API and convert.
            const {annotation_json: oldAnnoStr} = await client.default.getVideoAnnotation({videoId: id});
            if (oldAnnoStr) {
              anno = mustDecodeAnnotationJsonStr(oldAnnoStr);

              // write back so next time will not fallback
              writeAnnotationToYjs(anno, doc);
            }
          }

          // stringify for backward-compatibility
          resolve(JSON.stringify(anno));
        });
      });

      return {annotation_json: annoJson, annotation_version: ''};
    },
  });
};

function wsOrigin(): string {
  if (process.env.NODE_ENV === 'development') {
    // Somehow websocket can not be proxied at develop time.
    // Thus we hard-code this value, whose port is the same as that of the `proxy` in `package.json`.
    return `ws://${window.location.hostname}:12346`;
  }
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${wsProtocol}://${window.location.host}`;
}
