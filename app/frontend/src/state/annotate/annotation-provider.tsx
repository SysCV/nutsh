import {ReactNode, createContext, useContext} from 'react';
import {State, createAnnoStore} from './annotation';
import {useStore} from 'zustand';

type T = ReturnType<typeof createAnnoStore>;
const Context = createContext<T>(undefined!);

export function useAnnoStoreRaw() {
  const store = useContext(Context);
  return store;
}

export function useAnnoStore<T>(selector: (state: State) => T, equalityFn?: (a: T, b: T) => boolean) {
  const store = useContext(Context);
  return useStore(store, selector, equalityFn);
}

export function AnnoProvider({children}: {children: ReactNode}): JSX.Element {
  const store = createAnnoStore();
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
