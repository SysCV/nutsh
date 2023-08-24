import create from 'zustand';
import {immer} from 'zustand/middleware/immer';

import {midpoint} from 'common/geometry';

import type {EntityId, ComponentId, Vertex} from 'type/annotation';
import {deepClone} from 'common/util';

export type Target = {
  entityId: EntityId;
  componentId: ComponentId;
  vertices: Vertex[];
};

export type Data = {
  target: Target;
  vertexIdx: number;
  controlIdx: number | undefined;
};

export type State = {
  data: Data | undefined;

  start: (target: Target, vertexIdx: number) => void;
  startMidpoint: (target: Target, midpointIdx: number) => void;
  startBezier: (target: Target, vertexIdx: number, controlIdx: number) => void;
  finish: () => void;
};

export const useStore = create<State>()(
  immer(set => ({
    data: undefined,
    start: (target: Target, vertexIdx: number) => {
      set(s => {
        const cloned = deepClone(target);
        s.data = {target: cloned, vertexIdx, controlIdx: undefined};
      });
    },
    startMidpoint: (target: Target, midpointIdx: number) => {
      set(s => {
        const cloned = deepClone(target);

        // add the midpoint to the entity
        const mid = midpoint(
          cloned.vertices.map(v => v.coordinates),
          midpointIdx
        );
        cloned.vertices.splice(midpointIdx + 1, 0, {coordinates: mid});

        s.data = {
          target: cloned,
          vertexIdx: midpointIdx + 1,
          controlIdx: undefined,
        };
      });
    },
    startBezier: (target: Target, vertexIdx: number, controlIdx: number) => {
      set(s => {
        const cloned = deepClone(target);
        s.data = {target: cloned, vertexIdx, controlIdx};
      });
    },
    finish: () => {
      set(s => {
        s.data = undefined;
      });
    },
  }))
);
