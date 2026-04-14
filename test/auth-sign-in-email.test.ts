/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { generateSalt, hashPassword } from "../src/worker/utils/password";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS "account" (
    "id" text PRIMARY KEY NOT NULL,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" text NOT NULL,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" integer,
    "refresh_token_expires_at" integer,
    "scope" text,
    "password" text,
    "created_at" integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
  )`,
  `CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "app_user_profile" (
    "user_id" text PRIMARY KEY NOT NULL,
    "root_dir_id" text NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "app_user_profile_root_dir_id_unique" ON "app_user_profile" ("root_dir_id")`,
  `CREATE TABLE IF NOT EXISTS "rate_limit" (
    "id" text PRIMARY KEY NOT NULL,
    "key" text NOT NULL,
    "count" integer NOT NULL,
    "last_request" integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_key_unique" ON "rate_limit" ("key")`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY NOT NULL,
    "expires_at" integer NOT NULL,
    "token" text NOT NULL,
    "created_at" integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    "updated_at" integer NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token")`,
  `CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "email_verified" integer DEFAULT false NOT NULL,
    "image" text,
    "created_at" integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    "updated_at" integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email")`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" integer NOT NULL,
    "created_at" integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
    "updated_at" integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`,
] as const;

function createEmailAddress(): string {
  return `sign-in-${crypto.randomUUID()}@example.com`;
}

async function ensureSchema(): Promise<void> {
  for (const statement of MIGRATIONS) {
    const normalizedStatement = statement.replace(/\s+/g, " ").trim();
    await env.AUTH_DB.prepare(normalizedStatement).run();
  }
}

async function seedVerifiedCredentialUser(email: string, password: string): Promise<void> {
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const now = Date.now();
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  await env.AUTH_DB.prepare(
    [
      "insert into user (id, name, email, email_verified, created_at, updated_at)",
      "values (?, ?, ?, ?, ?, ?)",
    ].join(" "),
  )
    .bind(userId, "Sign In Test", email, 1, now, now)
    .run();

  await env.AUTH_DB.prepare(
    [
      "insert into account (id, account_id, provider_id, user_id, password, created_at, updated_at)",
      "values (?, ?, ?, ?, ?, ?, ?)",
    ].join(" "),
  )
    .bind(accountId, email, "credential", userId, passwordHash, now, now)
    .run();
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
    await ensureSchema();
  });

  it("returns a stable json error instead of failing the dev fetch for wrong passwords", async () => {
    const email = createEmailAddress();
    const password = "Password123A";
    await seedVerifiedCredentialUser(email, password);

    const response = await apiFetch("/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({
        email,
        password: "WrongPassword123A",
        callbackURL: "/login?verified=1",
      }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: expect.any(String),
      message: expect.any(String),
    });
  });
});
