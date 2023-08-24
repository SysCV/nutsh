import {StateCreator} from 'zustand';

import type {State, MutateProjectSlice} from 'state/client/store';
import type {Project} from 'openapi/nutsh';

export const createMutateProjectSlice: StateCreator<
  State,
  [['zustand/immer', never]],
  [],
  MutateProjectSlice
> = set => ({
  isMutating: false,
  isImporting: false,
  project: undefined,

  startCreate: () => {
    set(s => {
      s.project.mutate.isMutating = true;
      s.project.mutate.project = undefined;
    });
  },
  startImport: () => {
    set(s => {
      s.project.mutate.isImporting = true;
      s.project.mutate.project = undefined;
    });
  },
  startUpdate: (project: Project) => {
    set(s => {
      s.project.mutate.isMutating = true;
      s.project.mutate.project = project;
    });
  },
  finish: () => {
    set(s => {
      s.project.mutate.isMutating = false;
      s.project.mutate.isImporting = false;
      s.project.mutate.project = undefined;
    });
  },
});
