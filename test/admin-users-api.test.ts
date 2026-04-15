/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AdminUserListResponse } from "../src/types";
import {
  clearAuthTables,
  ensureAuthSchema,
  seedCredentialAccount,
  seedAuthSession,
  seedAuthUser,
} from "./helpers/auth-db";

async function apiFetch(path: string, cookie?: string): Promise<Response> {
  const headers = new Headers();

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  return SELF.fetch(`http://localhost${path}`, {
    headers,
  });
}

async function signInAndGetCookie(email: string, password: string): Promise<string> {
  const response = await SELF.fetch("http://localhost/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
    },
    body: JSON.stringify({
      email,
      password,
      callbackURL: "/login?verified=1",
    }),
  });

  expect(response.status).toBe(200);

  const setCookie = response.headers.get("Set-Cookie") ?? "";
  const sessionCookie =
    setCookie.match(/(?:^|,\s*)(?:__Secure-)?better-auth\.session_token=[^;]+/)?.[0]?.trim() ?? "";

  expect(sessionCookie).toContain("better-auth.session_token=");
  return sessionCookie.replace(/^,\s*/, "");
}

describe("admin users api", () => {
  beforeAll(async () => {
    await ensureAuthSchema();
  });

  beforeEach(async () => {
    await clearAuthTables();
    await env.FILE_YARD_KV.put("admin_emails", "admin@example.com");
  });

  it("returns 401 for unauthenticated requests", async () => {
    const response = await apiFetch("/api/admin/users");

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Unauthorized",
    });
  });

  it("returns 403 for authenticated non-admin users", async () => {
    const user = await seedAuthUser({
      email: "member@example.com",
      createdAt: Date.UTC(2026, 3, 1),
    });
    const password = "Password123Member";
    await seedCredentialAccount({
      userId: user.userId,
      email: user.email,
      password,
      createdAt: Date.UTC(2026, 3, 1),
    });
    const cookie = await signInAndGetCookie(user.email, password);

    const response = await apiFetch("/api/admin/users", cookie);

    expect(await env.FILE_YARD_KV.get("admin_emails")).toBeTruthy();
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: "Forbidden",
    });
  });

  it("returns paginated users and aggregates the latest login time for admins", async () => {
    const admin = await seedAuthUser({
      email: "admin@example.com",
      createdAt: Date.UTC(2026, 3, 1),
    });
    const adminPassword = "Password123Admin";
    await seedCredentialAccount({
      userId: admin.userId,
      email: admin.email,
      password: adminPassword,
      createdAt: Date.UTC(2026, 3, 10),
    });
    const adminCookie = await signInAndGetCookie(admin.email, adminPassword);
    const newest = await seedAuthUser({
      email: "newest@example.com",
      createdAt: Date.UTC(2026, 3, 5),
    });
    await seedAuthSession({
      userId: newest.userId,
      createdAt: Date.UTC(2026, 3, 7),
    });
    await seedAuthSession({
      userId: newest.userId,
      createdAt: Date.UTC(2026, 3, 8),
    });
    await seedAuthUser({
      email: "nologin@example.com",
      createdAt: Date.UTC(2026, 3, 4),
    });

    const response = await apiFetch("/api/admin/users?page=1&pageSize=2", adminCookie);

    expect(response.status).toBe(200);

    const payload = (await response.json()) as AdminUserListResponse;

    expect(payload).toMatchObject({
      success: true,
      page: 1,
      pageSize: 2,
      total: 3,
    });
    expect(payload.items).toHaveLength(2);
    expect(payload.items[0]).toMatchObject({
      email: "newest@example.com",
      createdAt: "2026-04-05T00:00:00.000Z",
      lastLoginAt: "2026-04-08T00:00:00.000Z",
    });
    expect(payload.items[1]).toMatchObject({
      email: "nologin@example.com",
      createdAt: "2026-04-04T00:00:00.000Z",
      lastLoginAt: null,
    });
  });
});
