import {useQuery, useMutation} from '@tanstack/react-query';

import type {NutshClient, DefaultService, Video} from 'openapi/nutsh';

export const useGetVideoAnnotation = (client: NutshClient, id: Video['id']) =>
  useQuery({
    queryKey: ['getVideoAnnotation', id],
    queryFn: () => client.default.getVideoAnnotation({videoId: id}),
  });

export const usePatchVideoAnnotation = (client: NutshClient) => {
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['patchVideoAnnotation']>[0]) =>
      client.default.patchVideoAnnotation(req),
  });
};
