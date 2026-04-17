/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { hashPassword } from "better-auth/crypto";

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

export async function ensureAuthSchema(): Promise<void> {
  for (const statement of MIGRATIONS) {
    await env.AUTH_DB.prepare(statement.replace(/\s+/g, " ").trim()).run();
  }
}

export async function clearAuthTables(): Promise<void> {
  const statements = [
    `DELETE FROM "session"`,
    `DELETE FROM "account"`,
    `DELETE FROM "verification"`,
    `DELETE FROM "app_user_profile"`,
    `DELETE FROM "user"`,
    `DELETE FROM "rate_limit"`,
  ] as const;

  for (const statement of statements) {
    await env.AUTH_DB.prepare(statement).run();
  }
}

export async function seedAuthUser(input: {
  createdAt: number;
  email: string;
  emailVerified?: boolean;
  id?: string;
  name?: string;
}): Promise<{ email: string; userId: string }> {
  const userId = input.id ?? crypto.randomUUID();
  const now = input.createdAt;

  await env.AUTH_DB.prepare(
    [
      `INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at")`,
      `VALUES (?, ?, ?, ?, ?, ?)`,
    ].join(" "),
  )
    .bind(
      userId,
      input.name ?? input.email.split("@")[0] ?? "user",
      input.email,
      input.emailVerified ?? 1,
      now,
      now,
    )
    .run();

  return { userId, email: input.email };
}

export async function seedAuthSession(input: {
  createdAt: number;
  expiresAt?: number;
  token?: string;
  userId: string;
}): Promise<{ token: string }> {
  const token = input.token ?? crypto.randomUUID();
  const createdAt = input.createdAt;
  const expiresAt = input.expiresAt ?? createdAt + 1000 * 60 * 60;

  await env.AUTH_DB.prepare(
    [
      `INSERT INTO "session" ("id", "expires_at", "token", "created_at", "updated_at", "user_id")`,
      `VALUES (?, ?, ?, ?, ?, ?)`,
    ].join(" "),
  )
    .bind(crypto.randomUUID(), expiresAt, token, createdAt, createdAt, input.userId)
    .run();

  return { token };
}

export async function seedCredentialAccount(input: {
  createdAt: number;
  email: string;
  password: string;
  userId: string;
}): Promise<void> {
  const passwordHash = await hashPassword(input.password);

  await env.AUTH_DB.prepare(
    [
      `INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")`,
      `VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ].join(" "),
  )
    .bind(
      crypto.randomUUID(),
      input.email,
      "credential",
      input.userId,
      passwordHash,
      input.createdAt,
      input.createdAt,
    )
    .run();
}
