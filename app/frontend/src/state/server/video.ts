import {useQuery, useMutation, useQueryClient, QueryClient} from '@tanstack/react-query';

import type {NutshClient, DefaultService, Video, Project} from 'openapi/nutsh';

export const useListVideos = (client: NutshClient, pid: Project['id']) =>
  useQuery({
    queryKey: ['searchVideos', pid],
    queryFn: () => client.default.listProjectVideos({projectId: pid}),
  });

export const useGetVideo = (client: NutshClient, id: Video['id']) =>
  useQuery({
    queryKey: ['getVideo', id],
    queryFn: () => client.default.getVideo({videoId: id}),
  });

export const useCreateVideo = (client: NutshClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['createVideo']>[0]) => client.default.createVideo(req),
    onSuccess: () => invalidateSearchVideos(queryClient),
  });
};

export const useUpdateVideo = (client: NutshClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['updateVideo']>[0]) => client.default.updateVideo(req),
    onSuccess: resp => invalidateSearchVideos(queryClient, resp.video.id),
  });
};

export const useDeleteVideo = (client: NutshClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['deleteVideo']>[0]) => client.default.deleteVideo(req),
    onSuccess: () => invalidateSearchVideos(queryClient),
  });
};

function invalidateSearchVideos(queryClient: QueryClient, id: Video['id'] | undefined = undefined) {
  queryClient.invalidateQueries({queryKey: ['searchVideos']});
  if (id) {
    queryClient.invalidateQueries({queryKey: ['getVideo', id]});
  }
}
