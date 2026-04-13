import type { Context, Next } from "hono";
import type { AppContext } from "../context";
import type { AppProfile } from "./profile";
import { getAuth, type AuthSession, type AuthUser } from "./index";
import { withRateLimitTableFallback } from "./rate-limit-fallback";

export type AuthVariables = {
  appProfile: AppProfile | null;
  session: AuthSession | null;
  user: AuthUser | null;
};

type SessionResponse = {
  session: AuthSession;
  user: AuthUser;
} | null;

export function authMiddleware() {
  return async (c: Context<AppContext>, next: Next) => {
    c.set("appProfile", null);
    c.set("session", null);
    c.set("user", null);

    try {
      const session = await withRateLimitTableFallback(
        async () =>
          (await getAuth(c).api.getSession({
            headers: c.req.raw.headers,
          })) as SessionResponse,
        async () =>
          (await getAuth(c, { disableRateLimit: true }).api.getSession({
            headers: c.req.raw.headers,
          })) as SessionResponse,
        (error) => {
          console.warn(
            "Better Auth rate_limit table is missing. Retrying session lookup without database rate limiting.",
            error,
          );
        },
      );

      if (session?.session && session.user) {
        c.set("session", session.session);
        c.set("user", session.user);
      }
    } catch (error) {
      console.error("Better Auth session resolution failed", error);
      c.set("appProfile", null);
      c.set("session", null);
      c.set("user", null);
    }

    await next();
  };
}

export function requireAuth() {
  return async (c: Context<AppContext>, next: Next) => {
    if (!c.get("user") || !c.get("session")) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    await next();
  };
}
