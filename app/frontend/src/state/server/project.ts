import {useQuery, useMutation, useQueryClient, QueryClient} from '@tanstack/react-query';

import {mustDecodeJsonStr} from 'type/project_spec';

import {NutshClient, DefaultService, Project} from 'openapi/nutsh';
import type {ProjectSpec} from 'type/project_spec';

export const useListProjects = (client: NutshClient) =>
  useQuery({
    queryKey: ['listProjects'],
    queryFn: () => client.default.listProjects(),
  });

export const useGetProject = (client: NutshClient, id: Project['id']) =>
  useQuery({
    queryKey: ['getProject', id],
    queryFn: () => decodeProjectSpec(client.default.getProject({projectId: id})),
  });

export const useCreateProject = (client: NutshClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['createProject']>[0]) => client.default.createProject(req),
    onSuccess: () => invalidateListProjects(queryClient),
  });
};

export const useUpdateProject = (client: NutshClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['updateProject']>[0]) => client.default.updateProject(req),
    onSuccess: resp => invalidateListProjects(queryClient, resp.project.id),
  });
};

export const useDeleteProject = (client: NutshClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['deleteProject']>[0]) => client.default.deleteProject(req),
    onSuccess: () => invalidateListProjects(queryClient),
  });
};

export const useImportProject = (client: NutshClient) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<DefaultService['importProject']>[0]) => client.default.importProject(req),
    onSuccess: () => invalidateListProjects(queryClient),
  });
};

export const useExportProject = (client: NutshClient, id: Project['id']) =>
  useQuery({
    queryKey: ['exportProject', id],
    queryFn: () => decodeProjectSpec(client.default.exportProject({projectId: id})),
    // disable this query from automatically running
    enabled: false,
  });

function invalidateListProjects(queryClient: QueryClient, id: Project['id'] | undefined = undefined) {
  queryClient.invalidateQueries({queryKey: ['listProjects']});
  if (id) {
    queryClient.invalidateQueries({queryKey: ['getProject', id]});
  }
}

function decodeProjectSpec<T extends {project: Project}>(query: Promise<T>) {
  return new Promise<T & {projectSpec: ProjectSpec}>((resolve, reject) => {
    query
      .then(resp => {
        const {spec_json: specJson} = resp.project;
        try {
          const projectSpec: ProjectSpec = specJson ? mustDecodeJsonStr(specJson) : {categories: []};
          resolve({...resp, projectSpec});
        } catch (e) {
          console.error(e);
          reject('error.invalid_project_spec_json');
        }
      })
      .catch(reject);
  });
}
