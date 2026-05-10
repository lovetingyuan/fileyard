/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { FileUploadLimitsResponse, ProfileResponse } from "../src/types";
import {
  clearAuthTables,
  ensureAuthSchema,
  seedAuthUser,
  seedCredentialAccount,
} from "./helpers/auth-db";

const BASIC_MAX_FILE_BYTES = 500 * 1024 * 1024;
const BASIC_MAX_FILES_PER_UPLOAD = 50;
const BASIC_MAX_TOTAL_BYTES = 10 * 1024 * 1024 * 1024;
const TEST_MULTIPART_PART_BYTES = 10 * 1024 * 1024;

function createEmailAddress(): string {
  return `limits-${crypto.randomUUID()}@example.com`;
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

async function createAuthenticatedUser(email = createEmailAddress()) {
  const now = Date.now();
  const password = "Password123A";
  const user = await seedAuthUser({
    email,
    createdAt: now,
    emailVerified: true,
  });
  await seedCredentialAccount({
    userId: user.userId,
    email,
    password,
    createdAt: now,
  });

  return {
    cookie: await signInAndGetCookie(email, password),
    userId: user.userId,
  };
}

async function apiFetch(path: string, init: RequestInit = {}, cookie?: string): Promise<Response> {
  const headers = new Headers(init.headers);

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  if (init.method && init.method !== "GET" && init.method !== "HEAD") {
    headers.set("Origin", "http://localhost");
  }

  const response = await SELF.fetch(`http://localhost${path}`, {
    ...init,
    headers,
  });

  if (response.body) {
    void response
      .clone()
      .arrayBuffer()
      .catch(() => undefined);
  }

  return response;
}

async function ensureProfile(cookie: string): Promise<void> {
  const response = await apiFetch("/api/profile", {}, cookie);
  expect(response.status).toBe(200);
}

async function setUserUploadPlan(userId: string, planKey: string): Promise<void> {
  await env.AUTH_DB.prepare(
    `UPDATE "app_user_profile" SET "upload_plan_key" = ? WHERE "user_id" = ?`,
  )
    .bind(planKey, userId)
    .run();
}

async function getRootDirId(userId: string): Promise<string> {
  const row = await env.AUTH_DB.prepare(
    `SELECT "root_dir_id" as rootDirId FROM "app_user_profile" WHERE "user_id" = ?`,
  )
    .bind(userId)
    .first<{ rootDirId: string }>();

  if (!row?.rootDirId) {
    throw new Error("Expected app profile rootDirId");
  }
  return row.rootDirId;
}

describe("upload limits api", () => {
  beforeAll(async () => {
    await ensureAuthSchema();
  });

  beforeEach(async () => {
    await clearAuthTables();
  });

  it("returns default basic upload plan limits and exposes the profile plan key", async () => {
    const { cookie } = await createAuthenticatedUser();

    const profileResponse = await apiFetch("/api/profile", {}, cookie);
    const profilePayload = (await profileResponse.json()) as ProfileResponse;
    const limitsResponse = await apiFetch("/api/files/upload-limits", {}, cookie);
    const limitsPayload = (await limitsResponse.json()) as FileUploadLimitsResponse;

    expect(profileResponse.status).toBe(200);
    expect(profilePayload.profile.uploadPlanKey).toBe("basic");
    expect(limitsResponse.status).toBe(200);
    expect(limitsPayload).toEqual({
      success: true,
      planKey: "basic",
      limits: {
        maxFileBytes: BASIC_MAX_FILE_BYTES,
        maxFilesPerUpload: BASIC_MAX_FILES_PER_UPLOAD,
        maxTotalBytes: BASIC_MAX_TOTAL_BYTES,
      },
      usage: {
        usedBytes: 0,
        remainingBytes: BASIC_MAX_TOTAL_BYTES,
        isUploadDisabled: false,
      },
      multipartPartBytes: TEST_MULTIPART_PART_BYTES,
    });
  });

  it("loads the user's configured upload plan from KV and falls back to basic for invalid plans", async () => {
    const { cookie, userId } = await createAuthenticatedUser();
    await ensureProfile(cookie);
    await env.FILE_YARD_KV.put(
      "upload-plan:tiny",
      JSON.stringify({
        key: "tiny",
        label: "Tiny",
        maxFileBytes: 20,
        maxFilesPerUpload: 2,
        maxTotalBytes: 100,
      }),
    );

    await setUserUploadPlan(userId, "tiny");
    const tinyResponse = await apiFetch("/api/files/upload-limits", {}, cookie);
    const tinyPayload = (await tinyResponse.json()) as FileUploadLimitsResponse;

    expect(tinyResponse.status).toBe(200);
    expect(tinyPayload.planKey).toBe("tiny");
    expect(tinyPayload.limits).toEqual({
      maxFileBytes: 20,
      maxFilesPerUpload: 2,
      maxTotalBytes: 100,
    });

    await env.FILE_YARD_KV.put("upload-plan:broken", JSON.stringify({ key: "broken" }));
    await setUserUploadPlan(userId, "broken");
    const fallbackResponse = await apiFetch("/api/files/upload-limits", {}, cookie);
    const fallbackPayload = (await fallbackResponse.json()) as FileUploadLimitsResponse;

    expect(fallbackResponse.status).toBe(200);
    expect(fallbackPayload.planKey).toBe("basic");
    expect(fallbackPayload.limits.maxFileBytes).toBe(BASIC_MAX_FILE_BYTES);
  });

  it("counts user storage from R2 while excluding folder markers and profile system files", async () => {
    const { cookie, userId } = await createAuthenticatedUser();
    await ensureProfile(cookie);
    const rootDirId = await getRootDirId(userId);
    await env.FILES_BUCKET.put(`${rootDirId}/visible.bin`, new Uint8Array(7));
    await env.FILES_BUCKET.put(`${rootDirId}/docs/.fileyard-folder`, new Uint8Array());
    await env.FILES_BUCKET.put(`${rootDirId}/.user/avatar.png`, new Uint8Array(9));

    const response = await apiFetch("/api/files/upload-limits", {}, cookie);
    const payload = (await response.json()) as FileUploadLimitsResponse;

    expect(response.status).toBe(200);
    expect(payload.usage).toEqual({
      usedBytes: 7,
      remainingBytes: BASIC_MAX_TOTAL_BYTES - 7,
      isUploadDisabled: false,
    });
  });

  it("rejects new uploads over the total storage limit while allowing overwrite replacement math", async () => {
    const { cookie, userId } = await createAuthenticatedUser();
    await ensureProfile(cookie);
    await env.FILE_YARD_KV.put(
      "upload-plan:eight-bytes",
      JSON.stringify({
        key: "eight-bytes",
        label: "Eight bytes",
        maxFileBytes: 20,
        maxFilesPerUpload: 50,
        maxTotalBytes: 8,
      }),
    );
    await setUserUploadPlan(userId, "eight-bytes");
    const rootDirId = await getRootDirId(userId);
    await env.FILES_BUCKET.put(`${rootDirId}/existing.bin`, new Uint8Array(7));

    const rejectedResponse = await apiFetch(
      "/api/files/object?name=new.bin",
      {
        method: "PUT",
        headers: {
          "Content-Length": "2",
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(2),
      },
      cookie,
    );
    expect(rejectedResponse.status).toBe(413);

    const overwriteResponse = await apiFetch(
      "/api/files/object?name=existing.bin&overwrite=true",
      {
        method: "PUT",
        headers: {
          "Content-Length": "8",
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(8),
      },
      cookie,
    );
    expect(overwriteResponse.status).toBe(201);
  });
});
