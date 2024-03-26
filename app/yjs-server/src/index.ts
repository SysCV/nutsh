// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- fine
/// <reference path="../../frontend/src/common/yjs/y-websocket.d.ts" />

import http from "node:http";
import { WebSocketServer } from "ws";
import { verbose, Database } from "sqlite3";
// If I install and import `yjs` directly from this package, a warning will show:
// - Yjs was already imported. This breaks constructor checks and will lead to issues!
// - https://github.com/yjs/yjs/issues/438
// To resolve it, we import the yjs from the `frontend` package.
// It is not elegant, but only as a temporary workaround.
// TODO(xu): introduce workspace to better organize projects.
import { setupWSConnection, setPersistence } from "../../frontend/src/common/yjs";
import { writeAnnotationToYjs, readAnnotationFromYjs } from "../../frontend/src/common/yjs/convert";
import { mustDecodeJsonStr as mustDecodeAnnotationJsonStr } from "../../frontend/src/type/annotation";

const databasePath = process.env.DATABASE_PATH;
if (!databasePath) {
  throw new Error("missing DATABASE_PATH");
}

const readOnly = process.env.READ_ONLY;

verbose();
const db = new Database(databasePath);

const server = http.createServer((_, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("ok");
});

// Do not use `new WebSocket.Server` but `new WebSocketServer`. Otherwise, it will panic at runtime after bundling.
// https://github.com/websockets/ws/issues/1538#issuecomment-944859160
const wss = new WebSocketServer({ noServer: true });

const urlPtn = /^\/video\/(?<id>[0-9a-zA-Z]+)$/;
wss.on("connection", (ws, req) => {
  const url = req.url || "";
  const videoId = urlPtn.exec(url)?.groups?.id;
  if (!videoId) {
    ws.close(1002, `invalid URL: ${url}`);
    return;
  }
  setupWSConnection(ws, req, { docName: videoId });
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

// Replace the original persistence
// https://github.com/yjs/y-websocket/blob/1638374702d694e5b58ea89d291fdf9d41faa09a/bin/utils.js#L34
// https://github.com/yjs/y-websocket/issues/76
setPersistence({
  bindState: async (videoId, doc): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      db.get<{ anno: string | null } | undefined>(
        "SELECT annotation_json AS anno FROM videos WHERE id = ?",
        [videoId],
        (err, row) => {
          if (err) {
            console.error(`failed to fetch annotation for video ${videoId}`, err.message);
            reject(err);
            return;
          }

          const annoJsonStr = row?.anno;
          if (!annoJsonStr) {
            // no annotation
            console.log(`initializing a new document for ${videoId}`);
            resolve();
            return;
          }

          // convert annotation to yjs doc
          try {
            const anno = mustDecodeAnnotationJsonStr(annoJsonStr);
            writeAnnotationToYjs(anno, doc);
          } catch (e) {
            console.log(`failed to decode annotation json for ${videoId}`, e);
            reject(new Error("failed to decode annotation json"));
            return;
          }

          // It is IMPORTANT to start listenning the `update` event AFTER the conversion,
          // since the conversion itself will trigger the update event.
          if (readOnly) {
            console.log("will NOT persist data in read-only mode");
          } else {
            doc.on("update", () => {
              console.log(`doc updated for video ${videoId}`);

              const a = readAnnotationFromYjs(doc);
              db.run("UPDATE videos SET annotation_json = ? WHERE id = ?", [JSON.stringify(a), videoId], (e) => {
                if (e) {
                  console.error(`failed to save annotation for video ${videoId}`, e.message);
                } else {
                  console.log(`persisted annotation for video ${videoId}`);
                }
              });
            });
          }

          resolve();
        }
      );
    });
  },
  writeState: async () => {
    // This is called when all connections to the document are closed.
    // Do nothing for now.
    return new Promise<void>((resolve) => {
      resolve();
    });
  },
});

server.on("close", () => {
  db.close((err) => {
    if (err) {
      console.error("failed to close sqlite3", err.message);
      return;
    }
    console.log("Closed the database connection.");
  });
});

const port = process.env.PORT || 7777;
server.listen(port, () => {
  console.log("running", { port, databasePath });
});
