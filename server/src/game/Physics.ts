import { GameState } from "@shared/types.js";
import { GAME_CONFIG } from "@shared/constants.js";

const {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BALL_SIZE,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_MARGIN,
  BALL_INITIAL_SPEED,
  BALL_SPEED_INCREMENT,
  BALL_MAX_SPEED,
  PADDLE_SPEED,
} = GAME_CONFIG;

/**
 * Pure physics module — receives state, mutates and returns it.
 * No side effects or dependencies on Room/WebSocket.
 */

export function movePaddle(
  state: GameState,
  paddle: "player1" | "player2",
  direction: "up" | "down" | "stop",
  dt: number
): void {
  const p = state.paddles[paddle];
  const speed = PADDLE_SPEED * dt * GAME_CONFIG.TICK_RATE;

  if (direction === "up") {
    p.y = Math.max(0, p.y - speed);
  } else if (direction === "down") {
    p.y = Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, p.y + speed);
  }
}

export function updateBall(state: GameState, _dt: number): void {
  const ball = state.ball;

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
  const p1 = state.paddles.player1;
  const p1x = PADDLE_MARGIN;
  if (
    ball.vx < 0 &&
    ball.x <= p1x + PADDLE_WIDTH &&
    ball.y + BALL_SIZE >= p1.y &&
    ball.y <= p1.y + PADDLE_HEIGHT
  ) {
    ball.x = p1x + PADDLE_WIDTH;
    ball.vx = -ball.vx;
    applyBounceAngle(ball, p1.y);
    accelerateBall(ball);
  }

  // Paddle collision — Player 2 (right)
  const p2 = state.paddles.player2;
  const p2x = CANVAS_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;
  if (
    ball.vx > 0 &&
    ball.x + BALL_SIZE >= p2x &&
    ball.y + BALL_SIZE >= p2.y &&
    ball.y <= p2.y + PADDLE_HEIGHT
  ) {
    ball.x = p2x - BALL_SIZE;
    ball.vx = -ball.vx;
    applyBounceAngle(ball, p2.y);
    accelerateBall(ball);
  }
}

function applyBounceAngle(
  ball: GameState["ball"],
  paddleY: number
): void {
  const relativeHit =
    (ball.y + BALL_SIZE / 2 - (paddleY + PADDLE_HEIGHT / 2)) /
    (PADDLE_HEIGHT / 2);
  ball.vy = relativeHit * BALL_INITIAL_SPEED;
}

function accelerateBall(ball: GameState["ball"]): void {
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  const newSpeed = Math.min(speed + BALL_SPEED_INCREMENT, BALL_MAX_SPEED);
  const factor = newSpeed / speed;
  ball.vx *= factor;
  ball.vy *= factor;
}

export function resetBall(state: GameState): void {
  const dirX = Math.random() > 0.5 ? 1 : -1;
  const dirY = (Math.random() - 0.5) * 2;
  const mag = Math.sqrt(1 + dirY * dirY);

  state.ball = {
    x: (CANVAS_WIDTH - BALL_SIZE) / 2,
    y: (CANVAS_HEIGHT - BALL_SIZE) / 2,
    vx: (BALL_INITIAL_SPEED * dirX) / mag,
    vy: (BALL_INITIAL_SPEED * dirY) / mag,
  };
}

export function createInitialState(): GameState {
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
