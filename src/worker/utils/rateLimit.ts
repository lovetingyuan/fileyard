import type { Context } from "hono";
import type { AppContext } from "../context";
import { jsonError } from "./response";

type RateLimitPolicy = {
  perIp: number;
  perIdentifier: number;
  windowMs: number;
};

type RateLimitedAction = "login" | "register" | "resend-verification" | "create-share-link";

const RATE_LIMIT_POLICIES: Record<RateLimitedAction, RateLimitPolicy> = {
  login: {
    perIp: 5,
    perIdentifier: 5,
    windowMs: 10 * 60 * 1000,
  },
  register: {
    perIp: 3,
    perIdentifier: 3,
    windowMs: 15 * 60 * 1000,
  },
  "resend-verification": {
    perIp: 3,
    perIdentifier: 3,
    windowMs: 15 * 60 * 1000,
  },
  "create-share-link": {
    perIp: 10,
    perIdentifier: 10,
    windowMs: 5 * 60 * 1000,
  },
};

type RateLimitDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

function getClientIp(c: Context<AppContext>): string {
  const forwardedFor = c.req.header("CF-Connecting-IP") ?? c.req.header("X-Forwarded-For");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return c.req.header("X-Real-IP") ?? "unknown";
}

async function checkLimit(
  c: Context<AppContext>,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitDecision> {
  const stub = c.env.RATE_LIMITER.getByName(key);
  const decision = await stub.checkLimit(limit, windowMs);
  return {
    allowed: decision.allowed,
    retryAfterSeconds: decision.retryAfterSeconds,
  };
}

export async function enforceRateLimit(
  c: Context<AppContext>,
  action: RateLimitedAction,
  identifier?: string | null,
): Promise<Response | null> {
  const policy = RATE_LIMIT_POLICIES[action];
  const keys = [
    {
      key: `${action}:ip:${getClientIp(c)}`,
      limit: policy.perIp,
    },
  ];

  if (identifier) {
    keys.push({
      key: `${action}:identifier:${identifier}`,
      limit: policy.perIdentifier,
    });
  }

  let retryAfterSeconds = 0;
  for (const entry of keys) {
    const decision = await checkLimit(c, entry.key, entry.limit, policy.windowMs);
    if (!decision.allowed) {
      retryAfterSeconds = Math.max(retryAfterSeconds, decision.retryAfterSeconds);
    }
  }

  if (retryAfterSeconds === 0) {
    return null;
  }

  return jsonError(c, "Too many requests. Please try again later.", 429, {
    "Retry-After": String(retryAfterSeconds),
  });
}
