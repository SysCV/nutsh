import create from 'zustand';
import {temporal} from 'zundo';
import {immer} from 'zustand/middleware/immer';

import {deepEqual} from 'common/util';
import type {Coordinates, Vertex} from 'type/annotation';

export type State = {
  vertices: Vertex[];
  mouse: Coordinates;

  start: (pos: Coordinates) => void;
  move: (pos: Coordinates) => void;
  add: (...vertices: Vertex[]) => void;
  finish: () => void;
};

export const useStore = create<State>()(
  temporal(
    immer(set => ({
      vertices: [],
      mouse: {x: 0, y: 0},

      start: (pos: Coordinates) => {
        set(s => {
          s.vertices = [{coordinates: pos}];
          s.mouse = pos;
        });
      },
      move: (pos: Coordinates) => {
        set(s => {
          s.mouse = pos;
        });
      },
      add: (...vertices: Vertex[]) => {
        set(s => {
          s.vertices.push(...vertices);
        });
      },
      finish: () => {
        set(s => {
          s.vertices = [];
          s.mouse = {x: 0, y: 0};
        });
      },
    })),
    {
      partialize: state => {
        const {vertices} = state;
        return {vertices};
      },
      equality: (past, curr) => deepEqual(past, curr),
    }
  )
);

export const useTemporalStore = create(useStore.temporal);
