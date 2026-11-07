/// <reference types="@cloudflare/vitest-plugin/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { hashPassword } from "better-auth/crypto";
import authSchema from "../drizzle/0000_purple_xorn.sql?raw";
import normalizeLegacyCredentialIds from "../drizzle/0003_normalize_legacy_credential_ids.sql?raw";
import { findProtectedPath, setFolderPassword } from "../src/worker/utils/folderPasswords";
import { getFolderMarkerKey } from "../src/worker/utils/fileManager";

const USER_ID = "test-user";
const EMAIL = "folder-password-recovery@example.com";
const PASSWORD = "ValidPassword1";
const ROOT_DIR_ID = "folder-password-recovery-root";
const FOLDER_PATH = "private";
const CLIENT_IP = "203.0.113.99";
const RECOVERY_KEY = `folder-password-recovery:${USER_ID}`;
const ORIGIN = "http://localhost";
const RECOVERY_ROUTE = "/api/files/folders/password/forgot";

async function seedUser(accountId = USER_ID) {
  const now = Date.now();
  const passwordHash = await hashPassword(PASSWORD);

  await env.AUTH_DB.prepare(
    `INSERT INTO "user" ("id", "name", "email", "email_verified", "created_at", "updated_at") VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(USER_ID, "Test User", EMAIL, 1, now, now)
    .run();
  await env.AUTH_DB.prepare(
    `INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at") VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind("test-account", accountId, "credential", USER_ID, passwordHash, now, now)
    .run();
  await env.AUTH_DB.prepare(
    `INSERT INTO "app_user_profile" ("user_id", "root_dir_id", "created_at", "updated_at") VALUES (?, ?, ?, ?)`,
  )
    .bind(USER_ID, ROOT_DIR_ID, now, now)
    .run();
}

async function seedAuthenticatedUser(): Promise<string> {
  await seedUser();
  await env.FILES_BUCKET.put(getFolderMarkerKey(ROOT_DIR_ID, FOLDER_PATH), new Uint8Array());
  await setFolderPassword(env, ROOT_DIR_ID, FOLDER_PATH, PASSWORD);

  const signInResponse = await postJson("/api/auth/sign-in/email", {
    email: EMAIL,
    password: PASSWORD,
  });
  expect(signInResponse.status).toBe(200);
  return getSessionCookie(signInResponse);
}

function getSessionCookie(response: Response): string {
  const sessionCookie = response.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith("better-auth.session_token="));
  if (!sessionCookie) {
    throw new Error("Expected Better Auth sign-in to set a session cookie");
  }

  return sessionCookie.split(";")[0];
}

function postJson(path: string, body: Record<string, string>, cookie?: string): Promise<Response> {
  return SELF.fetch(new URL(path, ORIGIN), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: ORIGIN,
      "CF-Connecting-IP": CLIENT_IP,
      ...(cookie && { Cookie: cookie }),
    },
    body: JSON.stringify(body),
  });
}

function mockEmails() {
  const emails: { html: string; to: string[] }[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    if (request.method === "POST" && request.url === "https://api.resend.com/emails") {
      emails.push(await request.json<(typeof emails)[number]>());
      return new Response(null, { status: 202 });
    }

    throw new Error(`Unexpected external fetch: ${request.method} ${request.url}`);
  });
  return emails;
}

function readEmailValue(html: string, pattern: RegExp): string {
  const value = html.match(pattern)?.[1];
  if (!value) {
    throw new Error("Expected to find the verification code or link in the email");
  }
  return value;
}

async function requestRecoveryCode(cookie: string): Promise<string> {
  const emails = mockEmails();
  const response = await postJson(RECOVERY_ROUTE, { path: FOLDER_PATH }, cookie);
  expect(response.status).toBe(200);
  await vi.waitFor(() => expect(emails).toHaveLength(1));
  return readEmailValue(emails[0].html, />\s*(\d{6})\s*</);
}

beforeAll(async () => {
  await env.AUTH_DB.batch(
    authSchema
      .split("--> statement-breakpoint")
      .map((statement) => env.AUTH_DB.prepare(statement.trim())),
  );
});

beforeEach(async () => {
  for (const table of [
    "session",
    "account",
    "verification",
    "app_user_profile",
    "user",
    "rate_limit",
  ]) {
    await env.AUTH_DB.prepare(`DELETE FROM "${table}"`).run();
  }
  await env.FILE_YARD_KV.delete(RECOVERY_KEY);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

it("migrates a legacy password account without changing the linked Google account", async () => {
  await seedUser(EMAIL);
  const now = Date.now();
  await env.AUTH_DB.prepare(
    'INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "created_at", "updated_at") VALUES (?, ?, ?, ?, ?, ?)',
  )
    .bind("test-google-account", EMAIL, "google", USER_ID, now, now)
    .run();

  const migration = env.AUTH_DB.prepare(normalizeLegacyCredentialIds);
  expect((await migration.run()).meta.changes).toBe(1);
  expect((await migration.run()).meta.changes).toBe(0);
  const { results } = await env.AUTH_DB.prepare(
    'SELECT "id", "account_id", "user_id" FROM "account" ORDER BY "id"',
  ).all();
  expect(results).toEqual([
    { id: "test-account", account_id: USER_ID, user_id: USER_ID },
    { id: "test-google-account", account_id: EMAIL, user_id: USER_ID },
  ]);
  const signIn = await postJson("/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD });
  expect(signIn.status).toBe(200);
});

it("skips legacy accounts whose owner already has another password credential", async () => {
  await seedUser(EMAIL);
  await env.AUTH_DB.prepare(
    `INSERT INTO "account" ("id", "account_id", "provider_id", "user_id", "password", "created_at", "updated_at")
     SELECT 'another-credential', "user_id", "provider_id", "user_id", "password", "created_at", "updated_at"
     FROM "account" WHERE "id" = 'test-account'`,
  ).run();

  expect((await env.AUTH_DB.prepare(normalizeLegacyCredentialIds).run()).meta.changes).toBe(0);
});

describe("folder password recovery", () => {
  it("allows one concurrent request per IP and preserves the retry header and recovery state", async () => {
    const emails = mockEmails();
    const cookie = await seedAuthenticatedUser();
    const responses = await Promise.all([
      postJson(RECOVERY_ROUTE, { path: FOLDER_PATH }, cookie),
      postJson(RECOVERY_ROUTE, { path: FOLDER_PATH }, cookie),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 429]);
    const limitedResponse = responses.find((response) => response.status === 429);
    expect(limitedResponse?.headers.get("X-Retry-After")).toMatch(/^[1-9]\d*$/);
    await vi.waitFor(() => expect(emails).toHaveLength(1));
    const recoveryState = await env.FILE_YARD_KV.get(RECOVERY_KEY);
    expect(recoveryState).toBeTruthy();

    const retry = await postJson(RECOVERY_ROUTE, { path: FOLDER_PATH }, cookie);
    expect(retry.status).toBe(429);
    expect(emails).toHaveLength(1);
    expect(await env.FILE_YARD_KV.get(RECOVERY_KEY)).toBe(recoveryState);

    await env.AUTH_DB.prepare('UPDATE "rate_limit" SET "last_request" = ?')
      .bind(Date.now() - 120_000)
      .run();
    const afterWindow = await postJson(RECOVERY_ROUTE, { path: FOLDER_PATH }, cookie);
    expect(afterWindow.status).toBe(200);
    await vi.waitFor(() => expect(emails).toHaveLength(2));
  });

  it("rejects the correct code after three failed attempts", async () => {
    const cookie = await seedAuthenticatedUser();
    const otp = await requestRecoveryCode(cookie);
    const wrongOtp = otp === "000000" ? "111111" : "000000";

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await postJson(
        `${RECOVERY_ROUTE}/verify`,
        { path: FOLDER_PATH, otp: wrongOtp },
        cookie,
      );
      expect(response.status).toBe(400);
    }
    const response = await postJson(`${RECOVERY_ROUTE}/verify`, { path: FOLDER_PATH, otp }, cookie);
    expect(response.status).toBe(400);
    expect(await findProtectedPath(env, ROOT_DIR_ID, FOLDER_PATH)).toBe(FOLDER_PATH);
  });

  it("consumes the correct code and removes the folder password", async () => {
    const cookie = await seedAuthenticatedUser();
    const otp = await requestRecoveryCode(cookie);
    const response = await postJson(`${RECOVERY_ROUTE}/verify`, { path: FOLDER_PATH, otp }, cookie);
    expect(response.status).toBe(200);
    expect(await findProtectedPath(env, ROOT_DIR_ID, FOLDER_PATH)).toBeNull();
    expect(await env.FILE_YARD_KV.get(RECOVERY_KEY)).toBeNull();

    const replay = await postJson(
      "/api/auth/email-otp/verify-email",
      { email: EMAIL, otp },
      cookie,
    );
    expect(replay.status).toBe(400);
  });
});

it("verifies a new account by email and revokes its session after a password reset", async () => {
  const emails = mockEmails();
  const signUp = await postJson("/api/auth/sign-up/email", {
    email: EMAIL,
    name: "",
    password: PASSWORD,
    callbackURL: "/login?verified=1",
  });
  expect(signUp.status).toBe(200);
  await vi.waitFor(() => expect(emails).toHaveLength(1));
  expect(emails[0].to).toEqual([EMAIL]);

  const verifyLink = readEmailValue(emails[0].html, /href="([^"]+)"/).replaceAll("&amp;", "&");
  const mailLinkRequest = {
    redirect: "manual",
    headers: { "CF-Connecting-IP": CLIENT_IP },
  } satisfies RequestInit;
  const verification = await SELF.fetch(verifyLink, mailLinkRequest);
  expect(new URL(verification.headers.get("Location") ?? "", ORIGIN).href).toBe(
    `${ORIGIN}/login?verified=1`,
  );
  const signIn = await postJson("/api/auth/sign-in/email", { email: EMAIL, password: PASSWORD });
  expect(signIn.status).toBe(200);
  const cookie = getSessionCookie(signIn);

  const requestReset = await postJson("/api/auth/request-password-reset", {
    email: EMAIL,
    redirectTo: "/reset-password",
  });
  expect(requestReset.status).toBe(200);
  await vi.waitFor(() => expect(emails).toHaveLength(2));
  expect(emails[1].to).toEqual([EMAIL]);

  const resetLink = readEmailValue(emails[1].html, /href="([^"]+)"/).replaceAll("&amp;", "&");
  const redirect = await SELF.fetch(resetLink, mailLinkRequest);
  const resetPage = new URL(redirect.headers.get("Location") ?? "", ORIGIN);
  expect(resetPage.pathname).toBe("/reset-password");
  const newPassword = "NewValidPassword2";
  const reset = await postJson("/api/auth/reset-password", {
    token: resetPage.searchParams.get("token") ?? "",
    newPassword,
  });
  expect(reset.status).toBe(200);
  const profile = await SELF.fetch(`${ORIGIN}/api/profile`, { headers: { Cookie: cookie } });
  expect(profile.status).toBe(401);
  const signInWithNewPassword = await postJson("/api/auth/sign-in/email", {
    email: EMAIL,
    password: newPassword,
  });
  expect(signInWithNewPassword.status).toBe(200);
});

it("rejects a cross-site text/ping request on the protected file route", async () => {
  const response = await SELF.fetch(`${ORIGIN}${RECOVERY_ROUTE}`, {
    method: "POST",
    headers: { "Content-Type": "text/ping", "Sec-Fetch-Site": "cross-site" },
    body: "PING",
  });
  expect(response.status).toBe(403);
});
