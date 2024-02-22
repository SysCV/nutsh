import {createStore} from 'zustand';
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

export type HistoryState = {
  actions: ActionConjugation[];
  index: number;

  pushAction: (action: ActionConjugation) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
};

export function createAnnoHistoryStore() {
  return createStore<HistoryState>()(
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
}

export interface AnnoHistoryStore {
  undo: () => void;
  redo: () => void;
  clear: () => void;
  redoCount: number;
  undoCount: number;
}
