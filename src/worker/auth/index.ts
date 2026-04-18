import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Context } from "hono";
import type { AppBindings, AppContext } from "../context";
import { resolveAppOrigin } from "../utils/shareLinks";
import { createDb } from "../db/client";
import * as schema from "../db/schema";
import { createResetPasswordEmailSender, createVerificationEmailSender } from "./email";
import { createBetterAuthLogger } from "./logger";
import { createBetterAuthOptions } from "./options";
import { getOrCreateAppProfileByDb } from "./profile";

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
  const urlsToCheck = [request.url, env.APP_URL].filter((value): value is string => Boolean(value));

  return urlsToCheck.some((url) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname === "localhost" || hostname === "127.0.0.1";
    } catch {
      return false;
    }
  });
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

const authCache = new Map<string, ReturnType<typeof betterAuth>>();

export function getAuth(c: Context<AppContext>) {
  const isDev = isDevEnvironment(c.env, c.req.raw);

  const secret = c.env.BETTER_AUTH_SECRET;
  if (!secret && !isDev) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }

  const resolvedSecret = secret || "better-auth-development-secret-not-for-production";
  const baseURL = resolveBaseUrl(c.env, c.req.raw);
  const cacheKey = `${resolvedSecret}:${baseURL}`;

  const cached = authCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const db = createDb(c.env);
  const instance = betterAuth({
    ...createBetterAuthOptions({
      appName: "FileYard",
      baseURL,
      secret: resolvedSecret,
      googleClientId: c.env.GOOGLE_CLIENT_ID ?? "",
      googleClientSecret: c.env.GOOGLE_CLIENT_SECRET ?? "",
      trustedOrigins: async (request) => resolveTrustedOrigins(c.env, request),
      sendVerificationEmail: createVerificationEmailSender(c.env),
      sendResetPassword: createResetPasswordEmailSender(c.env),
      backgroundTaskHandler: (promise) => c.executionCtx.waitUntil(promise),
      onUserCreated: async (user) => {
        await getOrCreateAppProfileByDb(db, user.id, user.email);
      },
    }),
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema,
    }),
    logger: createBetterAuthLogger(isDev),
  });

  authCache.set(cacheKey, instance as ReturnType<typeof betterAuth>);
  return instance;
}
