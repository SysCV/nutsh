import create from 'zustand';
import {immer} from 'zustand/middleware/immer';

type VoidAction = () => void;

interface ActionConjugation {
  undo: VoidAction;
  redo: VoidAction;
}

const noop = () => {};
const initialAction: ActionConjugation = {
  undo: noop,
  redo: noop,
};

type HistoryState = {
  actions: ActionConjugation[];
  index: number;

  pushAction: (action: ActionConjugation) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
};

const useHistoryStore = create<HistoryState>()(
  immer(set => ({
    actions: [initialAction],
    index: 0,

    pushAction: (action: ActionConjugation) => {
      set(s => {
        if (s.index === s.actions.length - 1) {
          s.actions.push(action);
        } else {
          s.actions = [initialAction, action];
        }
        s.index = s.actions.length - 1;
      });
    },

    undo: () => {
      set(s => {
        if (s.index === 0) {
          return;
        }
        const {undo: fn} = s.actions[s.index];
        s.index--;
        fn();
      });
    },

    redo: () => {
      set(s => {
        if (s.index === s.actions.length - 1) {
          return;
        }
        const {redo: fn} = s.actions[s.index + 1];
        s.index++;
        fn();
      });
    },

    reset: () => {
      set(s => {
        s.actions = [initialAction];
        s.index = 0;
      });
    },
  }))
);

export interface TemporalStore {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  redoCount: number;
  undoCount: number;
}

export function useTemporalAnnoStore(): TemporalStore {
  const undo = useHistoryStore(s => s.undo);
  const redo = useHistoryStore(s => s.redo);
  const undoCount = useHistoryStore(s => s.index);
  const redoCount = useHistoryStore(s => s.actions.length - s.index - 1);
  const clear = useHistoryStore(s => s.reset);

  return {
    undo,
    redo,
    clear,
    redoCount,
    undoCount,
  };
}
