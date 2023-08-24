import {StateCreator} from 'zustand';

import type {Coordinates} from 'type/annotation';
import type {State} from 'state/annotate/render';

export interface SurroundSlice {
  data:
    | {
        startPoint: Coordinates;
        endPoint: Coordinates;
      }
    | undefined;

  start: (pos: Coordinates) => void;
  move: (pos: Coordinates) => void;
  finish: () => void;
}

export const createSurroundSlice: StateCreator<State, [['zustand/immer', never]], [], SurroundSlice> = set => ({
  data: undefined,
  start: (pos: Coordinates) => {
    set(s => {
      s.surround.data = {startPoint: pos, endPoint: pos};
    });
  },
  move: (pos: Coordinates) => {
    set(s => {
      if (!s.surround.data) return;
      s.surround.data.endPoint = pos;
    });
  },
  finish: () => {
    set(s => {
      s.surround.data = undefined;
    });
  },
});
