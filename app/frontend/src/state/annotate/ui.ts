import create from 'zustand';
import {immer} from 'zustand/middleware/immer';

export type ModeType = 'pan' | 'zoom' | 'rectangle' | 'polyline' | 'polygon' | 'mask' | 'wand' | 'wand-focused';

export type State = {
  mode: ModeType | undefined;
  setMode: (mode: ModeType | undefined) => void;

  mouseClient: [number, number] | undefined;
  setMouseClient: (mouseClient: [number, number] | undefined) => void;
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
  }))
);
