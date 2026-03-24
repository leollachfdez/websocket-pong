import { GameState, PlayerRole } from "@shared/types.js";
import { GAME_CONFIG } from "@shared/constants.js";
import { ServerMessage } from "@shared/messages.js";
import { movePaddle, updateBall, createInitialState } from "./Physics.js";
import { checkScoring } from "./Scoring.js";

export interface GameLoopCallbacks {
  broadcast: (message: ServerMessage) => void;
}

export class GameLoop {
  private interval: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private countdownTicks: number;
  private state: GameState;
  private inputQueue = new Map<string, { role: PlayerRole; direction: "up" | "down" | "stop" }>();
  private callbacks: GameLoopCallbacks;
  private scoreResumeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(callbacks: GameLoopCallbacks) {
    this.callbacks = callbacks;
    this.state = createInitialState();
    this.countdownTicks = GAME_CONFIG.COUNTDOWN_SECONDS * GAME_CONFIG.TICK_RATE;
  }

  getState(): GameState {
    return this.state;
  }

  getTick(): number {
    return this.tick;
  }

  queueInput(playerId: string, role: PlayerRole, direction: "up" | "down" | "stop"): void {
    this.inputQueue.set(playerId, { role, direction });
  }

  start(): void {
    if (this.interval) return;

    this.state.status = "countdown";
    const tickMs = 1000 / GAME_CONFIG.TICK_RATE;

    this.interval = setInterval(() => {
      this.tick++;
      const dt = tickMs / 1000;

      if (this.countdownTicks > 0) {
        this.countdownTicks--;
        if (this.countdownTicks === 0) {
          this.state.status = "playing";
        }
        this.broadcastState();
        return;
      }

      // Process inputs
      for (const [, input] of this.inputQueue) {
        movePaddle(this.state, input.role, input.direction, dt);
      }

      if (this.state.status === "playing") {
        updateBall(this.state, dt);

        const result = checkScoring(this.state);
        if (result.scored && result.scorer) {
          this.callbacks.broadcast({
            type: "score",
            scorer: result.scorer,
            score: { ...this.state.score },
          });

          if (result.gameOver && result.winner) {
            this.callbacks.broadcast({
              type: "end",
              winner: result.winner,
              score: { ...this.state.score },
            });
            this.stop();
            return;
          }

          // Resume after scored pause
          this.scoreResumeTimer = setTimeout(() => {
            if (this.state.status === "scored") {
              this.state.status = "playing";
            }
          }, 1000);
        }
      }

      this.broadcastState();
    }, tickMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    if (this.scoreResumeTimer) {
      clearTimeout(this.scoreResumeTimer);
      this.scoreResumeTimer = null;
    }
  }

  reset(): void {
    this.stop();
    this.state = createInitialState();
    this.tick = 0;
    this.countdownTicks = GAME_CONFIG.COUNTDOWN_SECONDS * GAME_CONFIG.TICK_RATE;
    this.inputQueue.clear();
  }

  private broadcastState(): void {
    this.callbacks.broadcast({
      type: "state",
      gameState: this.state,
      tick: this.tick,
    });
  }
}
