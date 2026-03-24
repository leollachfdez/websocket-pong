import { WebSocket } from "ws";
import { GameState, PlayerRole } from "@shared/types.js";
import { ServerMessage } from "@shared/messages.js";
import { GAME_CONFIG } from "@shared/constants.js";

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

  private gameLoop: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private gameState: GameState;
  private inputQueue: Map<string, "up" | "down" | "stop"> = new Map();

  constructor(code: string) {
    this.code = code;
    this.gameState = this.createInitialState();
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
    this.inputQueue.set(playerId, direction);
  }

  handleRematch(playerId: string): boolean {
    this.rematchVotes.add(playerId);
    if (this.rematchVotes.size === 2) {
      this.rematchVotes.clear();
      this.gameState = this.createInitialState();
      this.tick = 0;
      this.status = "playing";
      return true;
    }
    return false;
  }

  startGameLoop(): void {
    if (this.gameLoop) return;

    this.gameState.status = "countdown";
    let countdownTicks = GAME_CONFIG.COUNTDOWN_SECONDS * GAME_CONFIG.TICK_RATE;

    const interval = 1000 / GAME_CONFIG.TICK_RATE;
    this.gameLoop = setInterval(() => {
      this.tick++;
      this.lastActivity = Date.now();

      if (countdownTicks > 0) {
        countdownTicks--;
        if (countdownTicks === 0) {
          this.gameState.status = "playing";
        }
        this.broadcastState();
        return;
      }

      this.processInputs();
      this.updatePhysics(interval / 1000);
      this.checkScoring();
      this.broadcastState();
    }, interval);
  }

  stopGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
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

  private broadcastState(): void {
    this.broadcast({
      type: "state",
      gameState: this.gameState,
      tick: this.tick,
    });
  }

  private processInputs(): void {
    for (const player of this.players) {
      const dir = this.inputQueue.get(player.id);
      if (dir === undefined) continue;

      const paddle = this.gameState.paddles[player.role];
      const speed = GAME_CONFIG.PADDLE_SPEED;

      if (dir === "up") {
        paddle.y = Math.max(0, paddle.y - speed);
      } else if (dir === "down") {
        paddle.y = Math.min(
          GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT,
          paddle.y + speed
        );
      }
    }
  }

  private updatePhysics(_dt: number): void {
    const ball = this.gameState.ball;
    const { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_SIZE, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_MARGIN, BALL_SPEED_INCREMENT, BALL_MAX_SPEED } = GAME_CONFIG;

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Top/bottom wall collision
    if (ball.y <= 0) {
      ball.y = -ball.y;
      ball.vy = -ball.vy;
    } else if (ball.y + BALL_SIZE >= CANVAS_HEIGHT) {
      ball.y = 2 * (CANVAS_HEIGHT - BALL_SIZE) - ball.y;
      ball.vy = -ball.vy;
    }

    // Paddle collision — Player 1 (left)
    const p1 = this.gameState.paddles.player1;
    const p1x = PADDLE_MARGIN;
    if (
      ball.vx < 0 &&
      ball.x <= p1x + PADDLE_WIDTH &&
      ball.x + ball.vx <= p1x + PADDLE_WIDTH &&
      ball.y + BALL_SIZE >= p1.y &&
      ball.y <= p1.y + PADDLE_HEIGHT
    ) {
      ball.x = p1x + PADDLE_WIDTH;
      ball.vx = -ball.vx;
      // Angle variation based on impact point
      const relativeHit = (ball.y + BALL_SIZE / 2 - (p1.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      ball.vy = relativeHit * GAME_CONFIG.BALL_INITIAL_SPEED;
      // Speed increment
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const newSpeed = Math.min(speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);
      const factor = newSpeed / speed;
      ball.vx *= factor;
      ball.vy *= factor;
    }

    // Paddle collision — Player 2 (right)
    const p2 = this.gameState.paddles.player2;
    const p2x = CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;
    if (
      ball.vx > 0 &&
      ball.x + BALL_SIZE >= p2x &&
      ball.x + BALL_SIZE + ball.vx >= p2x &&
      ball.y + BALL_SIZE >= p2.y &&
      ball.y <= p2.y + PADDLE_HEIGHT
    ) {
      ball.x = p2x - BALL_SIZE;
      ball.vx = -ball.vx;
      const relativeHit = (ball.y + BALL_SIZE / 2 - (p2.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
      ball.vy = relativeHit * GAME_CONFIG.BALL_INITIAL_SPEED;
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const newSpeed = Math.min(speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);
      const factor = newSpeed / speed;
      ball.vx *= factor;
      ball.vy *= factor;
    }
  }

  private checkScoring(): void {
    const ball = this.gameState.ball;
    const { CANVAS_WIDTH, WINNING_SCORE } = GAME_CONFIG;

    let scorer: PlayerRole | null = null;

    if (ball.x <= 0) {
      scorer = "player2";
    } else if (ball.x >= CANVAS_WIDTH) {
      scorer = "player1";
    }

    if (scorer) {
      this.gameState.score[scorer]++;
      this.broadcast({
        type: "score",
        scorer,
        score: { ...this.gameState.score },
      });

      if (this.gameState.score[scorer] >= WINNING_SCORE) {
        this.gameState.status = "finished";
        this.broadcast({
          type: "end",
          winner: scorer,
          score: { ...this.gameState.score },
        });
        this.stopGameLoop();
        this.status = "finished";
      } else {
        this.resetBall();
        this.gameState.status = "scored";
        // Resume playing after a brief pause
        setTimeout(() => {
          if (this.gameState.status === "scored") {
            this.gameState.status = "playing";
          }
        }, 1000);
      }
    }
  }

  private resetBall(): void {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, BALL_SIZE, BALL_INITIAL_SPEED } = GAME_CONFIG;
    const dirX = Math.random() > 0.5 ? 1 : -1;
    const dirY = (Math.random() - 0.5) * 2;
    const mag = Math.sqrt(1 + dirY * dirY);

    this.gameState.ball = {
      x: (CANVAS_WIDTH - BALL_SIZE) / 2,
      y: (CANVAS_HEIGHT - BALL_SIZE) / 2,
      vx: (BALL_INITIAL_SPEED * dirX) / mag,
      vy: (BALL_INITIAL_SPEED * dirY) / mag,
    };
  }

  private createInitialState(): GameState {
    const { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_HEIGHT, BALL_SIZE, BALL_INITIAL_SPEED } = GAME_CONFIG;
    const paddleY = (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2;
    const dirX = Math.random() > 0.5 ? 1 : -1;

    return {
      ball: {
        x: (CANVAS_WIDTH - BALL_SIZE) / 2,
        y: (CANVAS_HEIGHT - BALL_SIZE) / 2,
        vx: BALL_INITIAL_SPEED * dirX,
        vy: 0,
      },
      paddles: {
        player1: { y: paddleY },
        player2: { y: paddleY },
      },
      score: { player1: 0, player2: 0 },
      status: "countdown",
    };
  }
}
