import {StateCreator} from 'zustand';
import type {State} from 'state/annotate/render';
import type {ComponentId, EntityId, SliceIndex} from 'type/annotation';

export interface ManipulateData {
  type: 'transfer' | 'interpolate';
  entityId: EntityId;
  sliceIndex: SliceIndex;
  componentId: ComponentId;
}

export interface ManipulateSlice {
  data: ManipulateData | undefined;

  start: (data: ManipulateData) => void;
  stop: () => void;
}

export const createManipulateSlice: StateCreator<State, [['zustand/immer', never]], [], ManipulateSlice> = set => ({
  data: undefined,

  start: (data: ManipulateData) => {
    set(s => {
      s.manipulate.data = data;
    });
  },
  stop: () => {
    set(s => {
      s.manipulate.data = undefined;
    });
  },
});
