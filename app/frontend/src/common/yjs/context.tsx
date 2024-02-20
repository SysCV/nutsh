import * as Y from 'yjs';
import {ReactNode, createContext, useContext} from 'react';

interface ContextData {
  doc: Y.Doc;
}

const YjsContext = createContext<ContextData>(undefined!);
export function useYjsContext(): ContextData {
  return useContext(YjsContext);
}

export function YjsProvider({children}: {children: ReactNode}): JSX.Element {
  const doc = new Y.Doc();
  return <YjsContext.Provider value={{doc}}>{children}</YjsContext.Provider>;
}
