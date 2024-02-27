import http from "node:http";
import fs from "node:fs";
import * as Y from "yjs";
import { WebSocketServer } from "ws";
import { setupWSConnection, setPersistence } from "y-websocket/bin/utils";

const dataDir = process.env.DATA_DIR;
if (!dataDir) {
  throw new Error("missing DATA_DIR");
}

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
  bindState: async (docName, doc): Promise<void> => {
    console.log("bindState", docName);

    try {
      const persisted = fs.readFileSync(`${dataDir}/${docName}.yjs`);
      Y.applyUpdate(doc, persisted);
    } catch (e) {
      console.log(`initializing a new document for ${docName}`);
    }

    doc.on("update", () => {
      // persist
      fs.writeFileSync(`${dataDir}/${docName}.yjs`, Y.encodeStateAsUpdate(doc));
    });

    return new Promise<void>((resolve) => {
      resolve();
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

const port = process.env.PORT || 7777;
server.listen(port, () => {
  console.log("running", { port, dataDir });
});
