declare module 'y-websocket/bin/utils' {
  import type {Doc} from 'yjs';

  export function setupWSConnection(conn: unknown, req: http.IncomingMessage, doc: {docName: string}): void;

  export function setPersistence(persistence: {
    bindState: (docName: string, ydoc: Doc) => Promise<void>;
    writeState: (docName: string, ydoc: Doc) => Promise<void>;
  }): void;
}
