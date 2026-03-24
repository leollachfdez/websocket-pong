import { Room } from "./Room.js";

const AMBIGUOUS_CHARS = new Set(["0", "O", "1", "l", "I"]);
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  .split("")
  .filter((c) => !AMBIGUOUS_CHARS.has(c));

const CODE_LENGTH = 4;
const CLEANUP_INTERVAL = 60_000; // 60 seconds
const INACTIVE_TIMEOUT = 5 * 60_000; // 5 minutes

export class RoomManager {
  private rooms = new Map<string, Room>();
  private playerRoomMap = new Map<string, string>(); // playerId → roomCode
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), CLEANUP_INTERVAL);
  }

  createRoom(playerId: string): Room {
    const code = this.generateCode();
    const room = new Room(code);
    this.rooms.set(code, room);
    this.playerRoomMap.set(playerId, code);
    return room;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code.toUpperCase());
  }

  getRoomByPlayer(playerId: string): Room | undefined {
    const code = this.playerRoomMap.get(playerId);
    return code ? this.rooms.get(code) : undefined;
  }

  joinRoom(code: string, playerId: string): Room | undefined {
    const room = this.getRoom(code);
    if (!room || room.status !== "waiting") return undefined;
    this.playerRoomMap.set(playerId, room.code);
    return room;
  }

  removePlayer(playerId: string): void {
    const code = this.playerRoomMap.get(playerId);
    if (!code) return;

    const room = this.rooms.get(code);
    if (room) {
      room.removePlayer(playerId);
      if (room.status === "destroyed" || room.players.length === 0) {
        room.stopGameLoop();
        this.rooms.delete(code);
      }
    }
    this.playerRoomMap.delete(playerId);
  }

  destroy(): void {
    clearInterval(this.cleanupTimer);
    for (const room of this.rooms.values()) {
      room.stopGameLoop();
    }
    this.rooms.clear();
    this.playerRoomMap.clear();
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      if (now - room.lastActivity > INACTIVE_TIMEOUT) {
        room.stopGameLoop();
        room.broadcast({ type: "error", message: "Room closed due to inactivity" });
        for (const p of room.players) {
          this.playerRoomMap.delete(p.id);
        }
        this.rooms.delete(code);
      }
    }
  }

  private generateCode(): string {
    let code: string;
    do {
      code = Array.from({ length: CODE_LENGTH }, () =>
        ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
      ).join("");
    } while (this.rooms.has(code));
    return code;
  }
}
