/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  clearAuthTables,
  ensureAuthSchema,
  seedAuthUser,
  seedCredentialAccount,
} from "./helpers/auth-db";

function createEmailAddress(): string {
  return `sign-in-${crypto.randomUUID()}@example.com`;
}

async function seedVerifiedCredentialUser(email: string, password: string): Promise<void> {
  const accountId = crypto.randomUUID();
  const now = Date.now();
  const user = await seedAuthUser({
    email,
    createdAt: now,
    emailVerified: true,
    name: "Sign In Test",
  });
  await seedCredentialAccount({
    userId: user.userId,
    email,
    password,
    createdAt: now,
  });
}

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Origin", "http://localhost");
  headers.set("CF-Connecting-IP", "203.0.113.10");

  return SELF.fetch(`http://localhost${path}`, {
    ...init,
    headers,
  });
}

describe("auth sign-in email errors", () => {
  beforeAll(async () => {
    await ensureAuthSchema();
  });

  beforeEach(async () => {
    await clearAuthTables();
  });

  it("fails when the Better Auth rate_limit table is missing instead of bypassing D1 rate limiting", async () => {
    const email = createEmailAddress();
    const password = "Password123A";
    await seedVerifiedCredentialUser(email, password);
    await env.AUTH_DB.prepare(`DROP TABLE IF EXISTS "rate_limit"`).run();

    const response = await apiFetch("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        callbackURL: "/login?verified=1",
      }),
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBeGreaterThanOrEqual(500);
    await expect(response.text()).resolves.toContain("Internal Server Error");
  });
});
