import {ConfigContext, NutshClientContext} from '@@frontend/common/context';
import {useQuery, useMutation} from '@tanstack/react-query';
import {useYjsContext} from 'common/yjs/context';
import type {NutshClient, DefaultService, Video} from 'openapi/nutsh';
import {useContext, useEffect, useState} from 'react';
import {WebsocketProvider} from 'y-websocket';
import {Annotation, mustDecodeJsonStr as mustDecodeAnnotationJsonStr} from 'type/annotation';
import {writeAnnotationToYjs} from '@@frontend/common/yjs/convert';

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

// Start synchronization for the annotation of the given video.
// If running in the read-only mode, the synchronization will be a fake one limited to the local.
// The initial annotation used to initialize the local state is returned:
// - `undefined` means the fetching is not ready;
// - for non-ready-only case, `null` will be returned, meaning no local annotation need to be initialzied;
// - for read-only case, a value will be returned, if any.
export const useAnnotationSync = (id: Video['id']): {initial: Annotation | null | undefined} => {
  const {doc} = useYjsContext();

  // We need to proceed differently for readonly mode.
  const {readonly} = useContext(ConfigContext);

  // The value used to initialize the local state.
  const [initial, setInitial] = useState<Annotation | null | undefined>(undefined);

  // for not read-only
  useEffect(() => {
    if (readonly) {
      return;
    }

    const origin = wsOrigin();
    new WebsocketProvider(origin, `ws/video/${id}`, doc);
    setInitial(null);
  }, [doc, id, readonly]);

  // for read-only
  const client = useContext(NutshClientContext).default;
  useEffect(() => {
    client.getVideoAnnotation({videoId: id}).then(({annotation_json: annoStr}) => {
      if (annoStr) {
        const anno = mustDecodeAnnotationJsonStr(annoStr);
        writeAnnotationToYjs(anno, doc);
        setInitial(anno);
      } else {
        setInitial(null);
      }
    });
  }, [client, doc, id]);

  return {initial};
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
