import create from 'zustand';
import {immer} from 'zustand/middleware/immer';

import type {EntityId, ComponentId, RectangleComponent} from 'type/annotation';
import {deepClone} from 'common/util';

export type Target = {
  entityId: EntityId;
  componentId: ComponentId;
  component: RectangleComponent;
};

export type Data = {
  target: Target;
  vertexIdx: number;
};

export type State = {
  data: Data | undefined;

  start: (target: Target, vertexIdx: number) => void;
  finish: () => void;
};

export const useStore = create<State>()(
  immer(set => ({
    data: undefined,
    start: (target: Target, vertexIdx: number) => {
      set(s => {
        const cloned = deepClone(target);
        s.data = {target: cloned, vertexIdx};
      });
    },
    finish: () => {
      set(s => {
        s.data = undefined;
      });
    },
  }))
);
