import {useMutation} from '@tanstack/react-query';

import type {NutshClient, DefaultService} from 'openapi/nutsh';

export const useCreateProjectSample = (client: NutshClient) => {
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['createProjectSample']>[0]) => client.default.createProjectSample(req),
  });
};
