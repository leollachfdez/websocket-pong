import crypto from "crypto";
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { MessageRouter } from "./network/MessageRouter.js";
import { RoomManager } from "./rooms/RoomManager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "3000", 10);

const app = express();
const server = createServer(app);

// Serve static client build in production and fallback to index.html
if (process.env.NODE_ENV === "production") {
  const clientDist = path.resolve(__dirname, "..", "..", "dist", "client");
  app.use(express.static(clientDist));

  // Fallback route for client-side routing. Exclude API routes to avoid swallowing future routes.
  app.get(/^(?!\/api\/).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

const roomManager = new RoomManager();
const messageRouter = new MessageRouter(roomManager);

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  const playerId = crypto.randomUUID();
  console.log(`[WS] Client connected: ${playerId}`);

  ws.on("message", (data) => {
    const raw = typeof data === "string" ? data : data.toString();
    messageRouter.handleMessage(ws, playerId, raw);
  });

  ws.on("close", () => {
    console.log(`[WS] Client disconnected: ${playerId}`);
    messageRouter.handleDisconnect(playerId);
  });

  // Heartbeat
  ws.on("pong", () => {
    (ws as any).__alive = true;
  });
  (ws as any).__alive = true;
});

// Heartbeat interval
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if ((ws as any).__alive === false) {
      ws.terminate();
      return;
    }
    (ws as any).__alive = false;
    ws.ping();
  });
}, 30_000);

wss.on("close", () => {
  clearInterval(heartbeat);
  roomManager.destroy();
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
});
