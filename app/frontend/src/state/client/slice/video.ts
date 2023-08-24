import {StateCreator} from 'zustand';

import type {State, MutateVideoSlice} from 'state/client/store';
import type {Video, Project} from 'openapi/nutsh';

export const createMutateVideoSlice: StateCreator<State, [['zustand/immer', never]], [], MutateVideoSlice> = set => ({
  creatingProjectId: undefined,
  updatingVideo: undefined,

  startCreate: (projectId: Project['id']) => {
    set(s => {
      s.video.mutate.creatingProjectId = projectId;
      s.video.mutate.updatingVideo = undefined;
    });
  },
  startUpdate: (video: Video) => {
    set(s => {
      s.video.mutate.creatingProjectId = undefined;
      s.video.mutate.updatingVideo = video;
    });
  },
  finish: () => {
    set(s => {
      s.video.mutate.creatingProjectId = undefined;
      s.video.mutate.updatingVideo = undefined;
    });
  },
});
