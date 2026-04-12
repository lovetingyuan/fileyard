import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Context } from "hono";
import type { AppBindings, AppContext } from "../context";
import { resolveAppOrigin } from "../utils/shareLinks";
import { createDb } from "../db/client";
import * as schema from "../db/schema";
import { createResetPasswordEmailSender, createVerificationEmailSender } from "./email";
import { createBetterAuthOptions } from "./options";
import { getOrCreateAppProfileByDb } from "./profile";

type GetAuthOptions = {
  disableRateLimit?: boolean;
};

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt?: Date | string | number;
  updatedAt?: Date | string | number;
};

export type AuthSession = {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date | string | number;
  createdAt?: Date | string | number;
  updatedAt?: Date | string | number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

function isDevEnvironment(env: AppBindings, request: Request): boolean {
  const url = env.APP_URL || request.url;
  try {
    const hostname = new URL(url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function resolveBaseUrl(env: AppBindings, request: Request): string {
  return resolveAppOrigin(request.url, env);
}

function resolveTrustedOrigins(env: AppBindings, request?: Request): string[] {
  const origins = new Set<string>();

  if (env.APP_URL) {
    try {
      origins.add(new URL(env.APP_URL).origin);
    } catch (error) {
      console.warn("APP_URL is not a valid URL:", error);
    }
  }

  if (request) {
    origins.add(new URL(request.url).origin);
  }

  return [...origins];
}

export function getAuth(c: Context<AppContext>, options: GetAuthOptions = {}) {
  const db = createDb(c.env);
  const isDev = isDevEnvironment(c.env, c.req.raw);

  const secret = c.env.BETTER_AUTH_SECRET;
  if (!secret && !isDev) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }

  return betterAuth({
    ...createBetterAuthOptions({
      appName: "Fileyard",
      baseURL: resolveBaseUrl(c.env, c.req.raw),
      disableRateLimit: options.disableRateLimit,
      secret: secret || "better-auth-development-secret-not-for-production",
      googleClientId: c.env.GOOGLE_CLIENT_ID ?? "",
      googleClientSecret: c.env.GOOGLE_CLIENT_SECRET ?? "",
      trustedOrigins: async (request) => resolveTrustedOrigins(c.env, request ?? c.req.raw),
      sendVerificationEmail: createVerificationEmailSender(c.env),
      sendResetPassword: createResetPasswordEmailSender(c.env),
      onUserCreated: async (user) => {
        await getOrCreateAppProfileByDb(db, user.id, user.email);
      },
      backgroundTaskHandler: c.executionCtx?.waitUntil
        ? (promise) => {
            c.executionCtx.waitUntil(promise);
          }
        : undefined,
    }),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
  });
}
