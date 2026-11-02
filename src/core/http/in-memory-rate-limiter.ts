import type { RateLimiter, RateLimitResult } from "../../core/http/rate-limiter.ts";

interface Bucket {
  count: number;
  resetAt: number;
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly storage = new Map<string, Bucket>();

  async consume(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Date.now();
    const bucket = this.storage.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.storage.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
      return {
        allowed: true,
        remaining: limit - 1,
        retryAfterSeconds: 0,
      };
    }

    if (bucket.count >= limit) {
      const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, retryAfterSeconds),
      };
    }

    bucket.count += 1;
    return {
      allowed: true,
      remaining: limit - bucket.count,
      retryAfterSeconds: 0,
    };
  }
}