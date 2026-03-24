import { GameState } from "@shared/types.js";
import { GAME_CONFIG } from "@shared/constants.js";

const {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_MARGIN,
  BALL_SIZE,
} = GAME_CONFIG;

const FONT = "'Press Start 2P', monospace";
const DASH_LENGTH = 15;
const DASH_GAP = 10;

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private scale = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.resize();
  }

  resize(): void {
    const parent = this.canvas.parentElement!;
    const maxW = parent.clientWidth;
    const maxH = parent.clientHeight;
    const ratio = CANVAS_WIDTH / CANVAS_HEIGHT;

    let w = maxW;
    let h = maxW / ratio;

    if (h > maxH) {
      h = maxH;
      w = maxH * ratio;
    }

    this.scale = w / CANVAS_WIDTH;
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
  }

  render(state: GameState): void {
    const ctx = this.ctx;
    const s = this.scale;

    // Clear
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Center line
    ctx.strokeStyle = "#FFF";
    ctx.lineWidth = 2 * s;
    ctx.setLineDash([DASH_LENGTH * s, DASH_GAP * s]);
    ctx.beginPath();
    ctx.moveTo((CANVAS_WIDTH / 2) * s, 0);
    ctx.lineTo((CANVAS_WIDTH / 2) * s, CANVAS_HEIGHT * s);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddles
    ctx.fillStyle = "#FFF";
    // Player 1 (left)
    ctx.fillRect(
      PADDLE_MARGIN * s,
      state.paddles.player1.y * s,
      PADDLE_WIDTH * s,
      PADDLE_HEIGHT * s
    );
    // Player 2 (right)
    ctx.fillRect(
      (CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH) * s,
      state.paddles.player2.y * s,
      PADDLE_WIDTH * s,
      PADDLE_HEIGHT * s
    );

    // Ball
    ctx.fillRect(
      state.ball.x * s,
      state.ball.y * s,
      BALL_SIZE * s,
      BALL_SIZE * s
    );

    // Score
    const fontSize = Math.round(32 * s);
    ctx.font = `${fontSize}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      String(state.score.player1),
      (CANVAS_WIDTH / 4) * s,
      20 * s
    );
    ctx.fillText(
      String(state.score.player2),
      ((CANVAS_WIDTH * 3) / 4) * s,
      20 * s
    );
  }

  renderCountdown(state: GameState, secondsLeft: number): void {
    this.render(state);
    const ctx = this.ctx;
    const s = this.scale;

    const fontSize = Math.round(72 * s);
    ctx.font = `${fontSize}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF";
    ctx.fillText(
      String(secondsLeft),
      (CANVAS_WIDTH / 2) * s,
      (CANVAS_HEIGHT / 2) * s
    );
  }

  renderOverlay(text: string, subtext?: string): void {
    const ctx = this.ctx;
    const s = this.scale;

    // Dim background
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Main text
    const fontSize = Math.round(24 * s);
    ctx.font = `${fontSize}px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFF";
    ctx.fillText(text, (CANVAS_WIDTH / 2) * s, (CANVAS_HEIGHT / 2) * s);

    if (subtext) {
      const subSize = Math.round(12 * s);
      ctx.font = `${subSize}px ${FONT}`;
      ctx.fillText(
        subtext,
        (CANVAS_WIDTH / 2) * s,
        (CANVAS_HEIGHT / 2 + 40) * s
      );
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getScale(): number {
    return this.scale;
  }
}
