import {ReactNode, createContext, useContext} from 'react';
import {State, createAnnoStore} from './annotation';
import {useStore} from 'zustand';
import {createAnnoHistoryStore, HistoryState} from './annotation-history';

const AnnoContext = createContext<ReturnType<typeof createAnnoStore>>(undefined!);
const AnnoHistoryContext = createContext<ReturnType<typeof createAnnoHistoryStore>>(undefined!);

export function useAnnoStoreRaw() {
  const store = useContext(AnnoContext);
  return store;
}

export function useAnnoStore<T>(selector: (state: State) => T, equalityFn?: (a: T, b: T) => boolean) {
  const store = useContext(AnnoContext);
  return useStore(store, selector, equalityFn);
}

export function useAnnoHistoryStore<T>(selector: (state: HistoryState) => T, equalityFn?: (a: T, b: T) => boolean) {
  const store = useContext(AnnoHistoryContext);
  return useStore(store, selector, equalityFn);
}

export function AnnoProvider({children}: {children: ReactNode}): JSX.Element {
  const annoStore = createAnnoStore();
  const annoHistoryStore = createAnnoHistoryStore();
  return (
    <AnnoContext.Provider value={annoStore}>
      <AnnoHistoryContext.Provider value={annoHistoryStore}>{children}</AnnoHistoryContext.Provider>
    </AnnoContext.Provider>
  );
}
