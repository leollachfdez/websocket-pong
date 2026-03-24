import { WebSocket } from "ws";
import { PlayerRole } from "@shared/types.js";
import { ServerMessage } from "@shared/messages.js";
import { GameLoop } from "../game/GameLoop.js";

export type RoomStatus = "waiting" | "playing" | "finished" | "destroyed";

export interface PlayerConnection {
  ws: WebSocket;
  role: PlayerRole;
  id: string;
}

export class Room {
  public readonly code: string;
  public status: RoomStatus = "waiting";
  public players: PlayerConnection[] = [];
  public lastActivity: number = Date.now();
  public rematchVotes = new Set<string>();

  private gameLoop: GameLoop | null = null;

  constructor(code: string) {
    this.code = code;
  }

  addPlayer(ws: WebSocket, playerId: string): PlayerRole | null {
    if (this.players.length >= 2) return null;

    const role: PlayerRole = this.players.length === 0 ? "player1" : "player2";
    this.players.push({ ws, role, id: playerId });
    this.lastActivity = Date.now();

    if (this.players.length === 2) {
      this.status = "playing";
    }

    return role;
  }

  removePlayer(playerId: string): void {
    this.players = this.players.filter((p) => p.id !== playerId);
    this.lastActivity = Date.now();

    if (this.status === "playing") {
      this.stopGameLoop();
      this.status = "finished";
      this.broadcast({ type: "opponent_disconnected" });
    } else if (this.players.length === 0) {
      this.status = "destroyed";
    }
  }

  getPlayer(playerId: string): PlayerConnection | undefined {
    return this.players.find((p) => p.id === playerId);
  }

  handleInput(playerId: string, direction: "up" | "down" | "stop"): void {
    this.lastActivity = Date.now();
    const player = this.getPlayer(playerId);
    if (player && this.gameLoop) {
      this.gameLoop.queueInput(playerId, player.role, direction);
    }
  }

  handleRematch(playerId: string): boolean {
    this.rematchVotes.add(playerId);
    if (this.rematchVotes.size === 2) {
      this.rematchVotes.clear();
      this.status = "playing";
      return true;
    }
    return false;
  }

  startGameLoop(): void {
    if (this.gameLoop) {
      this.gameLoop.stop();
    }

    this.gameLoop = new GameLoop({
      broadcast: (msg) => this.broadcast(msg),
    });

    this.gameLoop.start();
  }

  stopGameLoop(): void {
    if (this.gameLoop) {
      this.gameLoop.stop();
      this.gameLoop = null;
    }
  }

  broadcast(message: ServerMessage): void {
    const data = JSON.stringify(message);
    for (const player of this.players) {
      if (player.ws.readyState === WebSocket.OPEN) {
        player.ws.send(data);
      }
    }
  }

  sendTo(playerId: string, message: ServerMessage): void {
    const player = this.getPlayer(playerId);
    if (player && player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  }
}
