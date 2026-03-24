const DEFAULT_TOKENS_PER_SECOND = 60;
const DEFAULT_BUCKET_SIZE = 60;
const MAX_VIOLATIONS = 3;

interface Bucket {
  tokens: number;
  lastRefill: number;
  violations: number;
}

export class RateLimiter {
  private buckets = new Map<string, Bucket>();
  private tokensPerSecond: number;
  private bucketSize: number;

  constructor(
    tokensPerSecond = DEFAULT_TOKENS_PER_SECOND,
    bucketSize = DEFAULT_BUCKET_SIZE
  ) {
    this.tokensPerSecond = tokensPerSecond;
    this.bucketSize = bucketSize;
  }

  /** Returns true if the message is allowed, false if rate-limited */
  consume(playerId: string): boolean {
    const now = Date.now();
    let bucket = this.buckets.get(playerId);

    if (!bucket) {
      bucket = { tokens: this.bucketSize, lastRefill: now, violations: 0 };
      this.buckets.set(playerId, bucket);
    }

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(
      this.bucketSize,
      bucket.tokens + elapsed * this.tokensPerSecond
    );
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      return true;
    }

    bucket.violations++;
    return false;
  }

  /** Returns true if the player should be disconnected for persistent abuse */
  shouldDisconnect(playerId: string): boolean {
    const bucket = this.buckets.get(playerId);
    return !!bucket && bucket.violations >= MAX_VIOLATIONS;
  }

  remove(playerId: string): void {
    this.buckets.delete(playerId);
  }
}
