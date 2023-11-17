import create from 'zustand';
import {immer} from 'zustand/middleware/immer';

export type ModeType = 'pan' | 'zoom' | 'rectangle' | 'polyline' | 'polygon' | 'mask' | 'wand' | 'wand-focused';

export type State = {
  mode: ModeType | undefined;
  setMode: (mode: ModeType | undefined) => void;

  mouseClient: [number, number] | undefined;
  setMouseClient: (mouseClient: [number, number] | undefined) => void;

  tracking: {[key: string /* entity id */]: number /* progress in [0, 1] */};
  setTracking: (entityId: string, progress: number) => void;
  deleteTracking: (entityId: string) => void;
};

export const useStore = create<State>()(
  immer(set => ({
    mode: undefined,
    setMode: (mode: ModeType | undefined) => {
      set(s => {
        s.mode = mode;
      });
    },

    mouseClient: undefined,
    setMouseClient: (mouseClient: [number, number] | undefined) => {
      set(s => {
        s.mouseClient = mouseClient;
      });
    },

    tracking: {},
    setTracking: (entityId: string, progress: number) => {
      set(s => {
        s.tracking[entityId] = progress;
      });
    },
    deleteTracking: (entityId: string) => {
      set(s => {
        delete s.tracking[entityId];
      });
    },
  }))
);
