import create from 'zustand';
import {immer} from 'zustand/middleware/immer';
import type {Coordinates} from 'type/annotation';

export type State = {
  points: {anchor: Coordinates; mouse: Coordinates} | undefined;

  start: (pos: Coordinates) => void;
  move: (pos: Coordinates) => void;
  finish: () => void;
};

export const useStore = create<State>()(
  immer(set => ({
    points: undefined,

    start: (pos: Coordinates) => {
      set(s => {
        s.points = {anchor: pos, mouse: pos};
      });
    },
    move: (pos: Coordinates) => {
      set(s => {
        if (!s.points) return;
        s.points.mouse = pos;
      });
    },
    finish: () => {
      set(s => {
        s.points = undefined;
      });
    },
  }))
);
