import { ClientMessage } from "@shared/messages.js";

const VALID_TYPES = new Set(["join", "input", "rematch"]);
const VALID_DIRECTIONS = new Set(["up", "down", "stop"]);
const MAX_ROOM_CODE_LENGTH = 6;

export function validateMessage(raw: string): ClientMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj.type !== "string" || !VALID_TYPES.has(obj.type)) {
    return null;
  }

  switch (obj.type) {
    case "join": {
      if (obj.roomCode !== undefined) {
        if (
          typeof obj.roomCode !== "string" ||
          obj.roomCode.length === 0 ||
          obj.roomCode.length > MAX_ROOM_CODE_LENGTH ||
          !/^[A-Za-z0-9]+$/.test(obj.roomCode)
        ) {
          return null;
        }
      }
      return { type: "join", roomCode: obj.roomCode as string | undefined };
    }
    case "input": {
      if (typeof obj.direction !== "string" || !VALID_DIRECTIONS.has(obj.direction)) {
        return null;
      }
      return { type: "input", direction: obj.direction as "up" | "down" | "stop" };
    }
    case "rematch":
      return { type: "rematch" };
    default:
      return null;
  }
}
