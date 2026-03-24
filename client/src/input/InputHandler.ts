import { WebSocketClient } from "../network/WebSocketClient.js";

const KEY_MAP: Record<string, "up" | "down"> = {
  ArrowUp: "up",
  ArrowDown: "down",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
};

export class InputHandler {
  private currentDirection: "up" | "down" | "stop" = "stop";
  private keysDown = new Set<string>();
  private client: WebSocketClient;
  private onKeyDown: (e: KeyboardEvent) => void;
  private onKeyUp: (e: KeyboardEvent) => void;

  constructor(client: WebSocketClient) {
    this.client = client;

    this.onKeyDown = (e: KeyboardEvent) => {
      if (KEY_MAP[e.key]) {
        e.preventDefault();
        this.keysDown.add(e.key);
        this.updateDirection();
      }
    };

    this.onKeyUp = (e: KeyboardEvent) => {
      if (KEY_MAP[e.key]) {
        e.preventDefault();
        this.keysDown.delete(e.key);
        this.updateDirection();
      }
    };
  }

  start(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  stop(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.keysDown.clear();
    this.currentDirection = "stop";
  }

  private updateDirection(): void {
    let newDirection: "up" | "down" | "stop" = "stop";

    for (const key of this.keysDown) {
      const mapped = KEY_MAP[key];
      if (mapped) {
        newDirection = mapped;
        break;
      }
    }

    if (newDirection !== this.currentDirection) {
      this.currentDirection = newDirection;
      this.client.send({ type: "input", direction: newDirection });
    }
  }
}
