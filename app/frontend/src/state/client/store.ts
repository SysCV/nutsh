import create from 'zustand';
import {immer} from 'zustand/middleware/immer';

import {createMutateProjectSlice} from './slice/project';
import {createMutateVideoSlice} from './slice/video';

import type {Project, Video} from 'openapi/nutsh';

export interface MutateProjectSlice {
  isMutating: boolean;
  isImporting: boolean;
  project: Project | undefined;

  startCreate: () => void;
  startImport: () => void;
  startUpdate: (project: Project) => void;
  finish: () => void;
}

export interface MutateVideoSlice {
  creatingProjectId: Project['id'] | undefined;
  updatingVideo: Video | undefined;

  startCreate: (projectId: Project['id']) => void;
  startUpdate: (video: Video) => void;
  finish: () => void;
}

export interface State {
  project: {
    mutate: MutateProjectSlice;
  };
  video: {
    mutate: MutateVideoSlice;
  };
}

export const useStore = create<State>()(
  immer((...a) => ({
    project: {
      mutate: createMutateProjectSlice(...a),
    },
    video: {
      mutate: createMutateVideoSlice(...a),
    },
  }))
);
