import {useQuery} from '@tanstack/react-query';

import type {NutshClient} from 'openapi/nutsh';

export const useGetMetadata = (client: NutshClient) =>
  useQuery({
    queryKey: ['getMetadata'],
    queryFn: () => client.default.getMetadata(),
    staleTime: Infinity,
    retry: false,
  });

export const useGetConfig = (client: NutshClient) =>
  useQuery({
    queryKey: ['getConfig'],
    queryFn: () => client.default.getConfig(),
    staleTime: Infinity,
    retry: false,
  });
