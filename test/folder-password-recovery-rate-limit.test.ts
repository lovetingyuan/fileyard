/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "better-auth/crypto";
import { setFolderPassword } from "../src/worker/utils/folderPasswords";
import { getFolderMarkerKey } from "../src/worker/utils/fileManager";

const EMAIL = "folder-password-recovery@example.com";
const PASSWORD = "ValidPassword1";
const ROOT_DIR_ID = "folder-password-recovery-root";
const FOLDER_PATH = "private";
const CLIENT_IP = "203.0.113.99";
const RECOVERY_KEY = "folder-password-recovery:test-user";

const AUTH_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS "user" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "email_verified" integer DEFAULT false NOT NULL,
    "image" text,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_email_unique" ON "user" ("email")`,
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
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
  )`,
  `CREATE INDEX IF NOT EXISTS "account_userId_idx" ON "account" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "session" (
    "id" text PRIMARY KEY NOT NULL,
    "expires_at" integer NOT NULL,
    "token" text NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" text NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "session_token_unique" ON "session" ("token")`,
  `CREATE INDEX IF NOT EXISTS "session_userId_idx" ON "session" ("user_id")`,
  `CREATE TABLE IF NOT EXISTS "verification" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" integer NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier")`,
  `CREATE TABLE IF NOT EXISTS "rate_limit" (
    "id" text PRIMARY KEY NOT NULL,
    "key" text NOT NULL,
    "count" integer NOT NULL,
    "last_request" integer NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "rate_limit_key_unique" ON "rate_limit" ("key")`,
  `CREATE TABLE IF NOT EXISTS "app_user_profile" (
    "user_id" text PRIMARY KEY NOT NULL,
    "root_dir_id" text NOT NULL,
    "created_at" integer NOT NULL,
    "updated_at" integer NOT NULL,
    FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "app_user_profile_root_dir_id_unique" ON "app_user_profile" ("root_dir_id")`,
] as const;

async function seedAuthenticatedUser(): Promise<string> {
  const now = Date.now();
  const passwordHash = await hashPassword(PASSWORD);

  await env.AUTH_DB.prepare(
    `INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at") VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind("test-user", "Test User", EMAIL, 1, now, now)
    .run();
  await env.AUTH_DB.prepare(
    `INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at") VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind("test-account", EMAIL, "credential", "test-user", passwordHash, now, now)
    .run();
  await env.AUTH_DB.prepare(
    `INSERT INTO "app_user_profile" ("user_id", "root_dir_id", "created_at", "updated_at") VALUES (?, ?, ?, ?)`,
  )
    .bind("test-user", ROOT_DIR_ID, now, now)
    .run();

  await env.FILES_BUCKET.put(getFolderMarkerKey(ROOT_DIR_ID, FOLDER_PATH), new Uint8Array());
  await setFolderPassword(env, ROOT_DIR_ID, FOLDER_PATH, PASSWORD);

  const signInResponse = await SELF.fetch("http://localhost/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
      "CF-Connecting-IP": CLIENT_IP,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  expect(signInResponse.status).toBe(200);

  const sessionCookie = signInResponse.headers.get("Set-Cookie");
  if (!sessionCookie) {
    throw new Error("Expected Better Auth sign-in to set a session cookie");
  }

  return sessionCookie;
}

function requestRecoveryCode(cookie: string): Promise<Response> {
  return SELF.fetch("http://localhost/api/files/folders/password/forgot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      Origin: "http://localhost",
      "CF-Connecting-IP": CLIENT_IP,
    },
    body: JSON.stringify({ path: FOLDER_PATH }),
  });
}

beforeAll(async () => {
  for (const statement of AUTH_SCHEMA) {
    await env.AUTH_DB.prepare(statement.replace(/\s+/g, " ").trim()).run();
  }
});

beforeEach(async () => {
  for (const table of ["session", "account", "verification", "app_user_profile", "user", "rate_limit"]) {
    await env.AUTH_DB.prepare(`DELETE FROM "${table}"`).run();
  }
  await env.FILE_YARD_KV.delete(RECOVERY_KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("folder password recovery verification-code rate limit", () => {
  it("allows one request per IP, preserves the retry header, and leaves the initial recovery state intact", async () => {
    const emailTransport = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (request.method === "POST" && request.url === "https://api.resend.com/emails") {
        return new Response(null, { status: 202 });
      }

      throw new Error(`Unexpected external fetch: ${request.method} ${request.url}`);
    });
    vi.stubGlobal("fetch", emailTransport);
    const cookie = await seedAuthenticatedUser();

    const firstResponse = await requestRecoveryCode(cookie);
    expect(firstResponse.status).toBe(200);
    expect(emailTransport).toHaveBeenCalledTimes(1);

    const recoveryStateAfterFirstRequest = await env.FILE_YARD_KV.get(RECOVERY_KEY);
    expect(recoveryStateAfterFirstRequest).toBeTruthy();

    const secondResponse = await requestRecoveryCode(cookie);
    expect(secondResponse.status).toBe(429);
    expect(secondResponse.headers.get("X-Retry-After")).toMatch(/^[1-9]\d*$/);
    expect(emailTransport).toHaveBeenCalledTimes(1);
    expect(await env.FILE_YARD_KV.get(RECOVERY_KEY)).toBe(recoveryStateAfterFirstRequest);
  });
});
