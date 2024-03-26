import {useQuery, useMutation} from '@tanstack/react-query';
import {useYjsContext} from 'common/yjs/context';
import type {NutshClient, DefaultService, Video} from 'openapi/nutsh';
import {useEffect} from 'react';
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

export const useJoinYjs = (id: Video['id']) => {
  const {doc} = useYjsContext();
  useEffect(() => {
    const origin = wsOrigin();
    new WebsocketProvider(origin, `ws/video/${id}`, doc);
  }, [doc, id]);
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
