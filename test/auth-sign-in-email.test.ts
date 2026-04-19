/// <reference types="@cloudflare/vitest-pool-workers/types" />

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

  it("signs in successfully with the Better Auth rate limit schema", async () => {
    const email = createEmailAddress();
    const password = "Password123A";
    await seedVerifiedCredentialUser(email, password);

    const response = await apiFetch("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email,
        password,
        callbackURL: "/login?verified=1",
      }),
    });

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("better-auth.session_token=");
  });
});
