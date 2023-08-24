import {useQuery} from '@tanstack/react-query';

import type {DefaultService, NutshClient} from 'openapi/nutsh';

export const useGetOnlineSegmentation = (client: NutshClient) =>
  useQuery({
    queryKey: ['getOnlineSegmentation'],
    queryFn: () => client.default.getOnlineSegmentation(),
  });

type GetOnlineSegmentationEmbeddingParams = Parameters<DefaultService['getOnlineSegmentationEmbedding']>[0];
export const useGetOnlineSegmentationEmbedding = (client: NutshClient, params: GetOnlineSegmentationEmbeddingParams) =>
  useQuery({
    queryKey: ['getOnlineSegmentationEmbedding', params],
    queryFn: () => client.default.getOnlineSegmentationEmbedding(params),
  });
