import {StateCreator} from 'zustand';
import type {EntityComponentId, State} from 'state/annotate/render';
import type {Coordinates, SliceIndex} from 'type/annotation';

export interface TranslateData {
  components: EntityComponentId[];
  sliceIndex: SliceIndex;
  anchorImage: Coordinates;
}

export interface TranslateSlice {
  data: TranslateData | undefined;

  start: (data: TranslateData) => void;
  finish: () => void;
}

export const createTranslateSlice: StateCreator<State, [['zustand/immer', never]], [], TranslateSlice> = set => ({
  data: undefined,

  start: (data: TranslateData) => {
    set(s => {
      s.translate.data = data;
    });
  },
  finish: () => {
    set(s => {
      s.translate.data = undefined;
    });
  },
});
