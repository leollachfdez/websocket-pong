import { WebSocket } from "ws";
import { ClientMessage } from "@shared/messages.js";
import { RoomManager } from "../rooms/RoomManager.js";
import { validateMessage } from "../validation/MessageValidator.js";
import { RateLimiter } from "./RateLimiter.js";

export class MessageRouter {
  private roomManager: RoomManager;
  private rateLimiter: RateLimiter;

  constructor(roomManager: RoomManager) {
    this.roomManager = roomManager;
    this.rateLimiter = new RateLimiter();
  }

  handleMessage(ws: WebSocket, playerId: string, raw: string): void {
    // Rate limiting
    if (!this.rateLimiter.consume(playerId)) {
      if (this.rateLimiter.shouldDisconnect(playerId)) {
        ws.close(1008, "Rate limit exceeded");
        this.rateLimiter.remove(playerId);
      }
      return;
    }

    // Validate
    const message = validateMessage(raw);
    if (!message) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid message" }));
      return;
    }

    this.dispatch(ws, playerId, message);
  }

  handleDisconnect(playerId: string): void {
    this.rateLimiter.remove(playerId);
    this.roomManager.removePlayer(playerId);
  }

  private dispatch(ws: WebSocket, playerId: string, message: ClientMessage): void {
    switch (message.type) {
      case "join":
        this.handleJoin(ws, playerId, message.roomCode);
        break;
      case "input":
        this.handleInput(playerId, message.direction);
        break;
      case "rematch":
        this.handleRematch(playerId);
        break;
    }
  }

  private handleJoin(ws: WebSocket, playerId: string, roomCode?: string): void {
    // Already in a room?
    const existingRoom = this.roomManager.getRoomByPlayer(playerId);
    if (existingRoom) {
      ws.send(JSON.stringify({ type: "error", message: "Already in a room" }));
      return;
    }

    if (roomCode) {
      // Join existing room
      const room = this.roomManager.joinRoom(roomCode, playerId);
      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found or full" }));
        return;
      }

      const role = room.addPlayer(ws, playerId);
      if (!role) {
        ws.send(JSON.stringify({ type: "error", message: "Room is full" }));
        return;
      }

      // Notify both players
      for (const p of room.players) {
        p.ws.send(JSON.stringify({ type: "start", role: p.role }));
      }

      // Start the game
      room.startGameLoop();
    } else {
      // Create new room
      const room = this.roomManager.createRoom(playerId);
      const role = room.addPlayer(ws, playerId);
      ws.send(JSON.stringify({ type: "waiting", roomCode: room.code }));
    }
  }

  private handleInput(playerId: string, direction: "up" | "down" | "stop"): void {
    const room = this.roomManager.getRoomByPlayer(playerId);
    if (!room || room.status !== "playing") return;
    room.handleInput(playerId, direction);
  }

  private handleRematch(playerId: string): void {
    const room = this.roomManager.getRoomByPlayer(playerId);
    if (!room || room.status !== "finished") return;

    const allReady = room.handleRematch(playerId);
    if (allReady) {
      // Notify both players
      for (const p of room.players) {
        p.ws.send(JSON.stringify({ type: "start", role: p.role }));
      }
      room.startGameLoop();
    }
  }
}
