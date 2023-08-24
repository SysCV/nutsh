import {StateCreator} from 'zustand';

import type {EntityId} from 'type/annotation';
import type {State} from 'state/annotate/render';

export interface SelectSlice {
  ids: Set<EntityId>;

  set: (...ids: EntityId[]) => void;
  add: (...ids: EntityId[]) => void;
  toggle: (...ids: EntityId[]) => void;
  clear: () => void;
}

export const createSelectSlice: StateCreator<State, [['zustand/immer', never]], [], SelectSlice> = set => ({
  ids: new Set(),
  set: (...ids: EntityId[]) => {
    set(s => {
      s.select.ids = new Set(ids);
    });
  },
  add: (...ids: EntityId[]) => {
    set(s => {
      ids.forEach(id => s.select.ids.add(id));
    });
  },
  toggle: (...ids: EntityId[]) => {
    set(s => {
      ids.forEach(id => {
        const has = s.select.ids.has(id);
        if (has === undefined) {
          return;
        }
        if (has) {
          s.select.ids.delete(id);
        } else {
          s.select.ids.add(id);
        }
      });
    });
  },
  clear: () => {
    set(s => {
      s.select.ids = new Set();
    });
  },
});
