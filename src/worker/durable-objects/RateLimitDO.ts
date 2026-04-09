import { DurableObject } from "cloudflare:workers";

type RateLimitState = {
  count: number;
  windowStartedAt: number;
};

type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export class RateLimitDO extends DurableObject {
  async checkLimit(limit: number, windowMs: number, now = Date.now()): Promise<RateLimitDecision> {
    const stored = await this.ctx.storage.get<RateLimitState>("state");
    const currentState =
      stored && now - stored.windowStartedAt < windowMs
        ? stored
        : { count: 0, windowStartedAt: now };

    if (currentState.count >= limit) {
      const retryAfterMs = Math.max(currentState.windowStartedAt + windowMs - now, 0);
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
        remaining: 0,
      };
    }

    const nextState: RateLimitState = {
      count: currentState.count + 1,
      windowStartedAt: currentState.windowStartedAt,
    };

    await this.ctx.storage.put("state", nextState);
    await this.ctx.storage.setAlarm(nextState.windowStartedAt + windowMs);

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(limit - nextState.count, 0),
    };
  }

  async alarm(): Promise<void> {
    await this.ctx.storage.delete("state");
  }
}
