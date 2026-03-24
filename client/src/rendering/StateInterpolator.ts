import { GameState } from "@shared/types.js";

export class StateInterpolator {
  private prev: GameState | null = null;
  private current: GameState | null = null;
  private prevTime = 0;
  private currentTime = 0;

  push(state: GameState): void {
    this.prev = this.current;
    this.prevTime = this.currentTime;
    this.current = structuredClone(state);
    this.currentTime = performance.now();
  }

  getInterpolated(): GameState | null {
    if (!this.current) return null;
    if (!this.prev) return this.current;

    const now = performance.now();
    const dt = this.currentTime - this.prevTime;
    if (dt <= 0) return this.current;

    const alpha = Math.min((now - this.currentTime) / dt, 1);

    return {
      ball: {
        x: this.lerp(this.prev.ball.x, this.current.ball.x, alpha),
        y: this.lerp(this.prev.ball.y, this.current.ball.y, alpha),
        vx: this.current.ball.vx,
        vy: this.current.ball.vy,
      },
      paddles: {
        player1: {
          y: this.lerp(
            this.prev.paddles.player1.y,
            this.current.paddles.player1.y,
            alpha
          ),
        },
        player2: {
          y: this.lerp(
            this.prev.paddles.player2.y,
            this.current.paddles.player2.y,
            alpha
          ),
        },
      },
      score: this.current.score,
      status: this.current.status,
    };
  }

  getLatest(): GameState | null {
    return this.current;
  }

  reset(): void {
    this.prev = null;
    this.current = null;
    this.prevTime = 0;
    this.currentTime = 0;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
}
