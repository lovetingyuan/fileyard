import { hashPassword, verifyPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import type { Context } from "hono";
import type { AppContext } from "../context";
import { createDb } from "../db/client";
import { account, user } from "../db/schema";
import { enforceRateLimit } from "../utils/rateLimit";

const INVALID_EMAIL_OR_PASSWORD_BODY = {
  code: "INVALID_EMAIL_OR_PASSWORD",
  message: "Invalid email or password",
} as const;

type EmailSignInPayload = {
  email: string;
  password: string;
};

export function parseEmailSignInPayload(body: ArrayBuffer): EmailSignInPayload | null {
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(body));
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const candidate = parsed as { email?: unknown; password?: unknown };
    if (typeof candidate.email !== "string" || typeof candidate.password !== "string") {
      return null;
    }

    return {
      email: candidate.email,
      password: candidate.password,
    };
  } catch {
    return null;
  }
}

function createInvalidCredentialResponse(c: Context<AppContext>): Response {
  return c.json(INVALID_EMAIL_OR_PASSWORD_BODY, 401);
}

async function getStoredCredentialPassword(
  c: Context<AppContext>,
  email: string,
): Promise<string | null> {
  const db = createDb(c.env);
  const rows = await db
    .select({
      password: account.password,
    })
    .from(user)
    .innerJoin(account, and(eq(account.userId, user.id), eq(account.providerId, "credential")))
    .where(eq(user.email, email))
    .limit(1);

  return rows[0]?.password ?? null;
}

export async function preflightEmailSignIn(
  c: Context<AppContext>,
  payload: EmailSignInPayload | null,
): Promise<{ email: string | null; response: Response | null }> {
  const normalizedEmail =
    typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : null;

  const rateLimitedResponse = await enforceRateLimit(c, "sign-in-email", normalizedEmail);
  if (rateLimitedResponse) {
    return {
      email: normalizedEmail,
      response: rateLimitedResponse,
    };
  }

  if (!payload || !normalizedEmail || payload.password.length === 0) {
    return {
      email: normalizedEmail,
      response: null,
    };
  }

  const storedPassword = await getStoredCredentialPassword(c, normalizedEmail);
  if (!storedPassword) {
    await hashPassword(payload.password);
    return {
      email: normalizedEmail,
      response: createInvalidCredentialResponse(c),
    };
  }

  const passwordMatches = await verifyPassword({
    hash: storedPassword,
    password: payload.password,
  });
  if (passwordMatches) {
    return {
      email: normalizedEmail,
      response: null,
    };
  }

  return {
    email: normalizedEmail,
    response: createInvalidCredentialResponse(c),
  };
}
