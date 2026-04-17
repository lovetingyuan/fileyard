/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAuthTables, ensureAuthSchema } from "./helpers/auth-db";

function createEmailAddress(): string {
  return `sign-up-${crypto.randomUUID()}@example.com`;
}

async function apiFetch(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Origin", "http://localhost");
  headers.set("CF-Connecting-IP", "203.0.113.11");

  return SELF.fetch(`http://localhost${path}`, {
    ...init,
    headers,
  });
}

describe("auth sign-up email", () => {
  beforeAll(async () => {
    await ensureAuthSchema();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();
    await clearAuthTables();
  });

  it("creates a user and profile with a valid password", async () => {
    const email = createEmailAddress();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await apiFetch("/api/auth/sign-up/email", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "Password123A",
        name: "ignored-by-hook",
        callbackURL: "/login?registered=1",
      }),
    });

    expect(response.ok).toBe(true);

    const userRow = await env.AUTH_DB.prepare(`SELECT email FROM "user" WHERE "email" = ?`)
      .bind(email)
      .first<{ email: string }>();
    expect(userRow?.email).toBe(email);

    const profileCount = await env.AUTH_DB.prepare(
      `SELECT COUNT(*) as count FROM "app_user_profile"`,
    ).first<{ count: number }>();
    expect(Number(profileCount?.count ?? 0)).toBe(1);
  });
});
