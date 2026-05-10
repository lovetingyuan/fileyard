/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type {
  FileListResponse,
  MultipartUploadCreateResponse,
  MultipartUploadPart,
  MultipartUploadPartResponse,
} from "../src/types";
import {
  clearAuthTables,
  ensureAuthSchema,
  seedAuthUser,
  seedCredentialAccount,
} from "./helpers/auth-db";

const TEST_MULTIPART_PART_BYTES = 10 * 1024 * 1024;

function createEmailAddress(): string {
  return `multipart-${crypto.randomUUID()}@example.com`;
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

async function setUserUploadPlan(userId: string, planKey: string): Promise<void> {
  await env.AUTH_DB.prepare(
    `UPDATE "app_user_profile" SET "upload_plan_key" = ? WHERE "user_id" = ?`,
  )
    .bind(planKey, userId)
    .run();
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

async function uploadTextFile(name: string, contents: string, cookie: string) {
  return apiFetch(
    `/api/files/object?name=${encodeURIComponent(name)}`,
    {
      method: "PUT",
      headers: {
        "Content-Length": String(contents.length),
        "Content-Type": "text/plain",
      },
      body: contents,
    },
    cookie,
  );
}

async function createFolder(name: string, cookie: string) {
  return apiFetch(
    "/api/files/folders",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        parentPath: "",
      }),
    },
    cookie,
  );
}

describe("R2 multipart uploads", () => {
  beforeAll(async () => {
    await ensureAuthSchema();
  });

  beforeEach(async () => {
    await clearAuthTables();
  });

  it("uploads, completes, lists, and downloads a multipart file", async () => {
    const { cookie, userId } = await createAuthenticatedUser();
    const bytes = new Uint8Array(TEST_MULTIPART_PART_BYTES + 3);
    bytes[0] = 11;
    bytes[TEST_MULTIPART_PART_BYTES - 1] = 22;
    bytes[TEST_MULTIPART_PART_BYTES] = 33;
    bytes[TEST_MULTIPART_PART_BYTES + 2] = 44;

    const createResponse = await apiFetch(
      "/api/files/multipart",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPath: "",
          name: "large.bin",
          size: bytes.byteLength,
          contentType: "application/octet-stream",
        }),
      },
      cookie,
    );
    const createPayload = (await createResponse.json()) as MultipartUploadCreateResponse;

    expect(createResponse.status).toBe(201);
    expect(createPayload).toMatchObject({
      success: true,
      partSize: TEST_MULTIPART_PART_BYTES,
      partCount: 2,
    });

    const uploadedParts: MultipartUploadPart[] = [];
    for (let index = 0; index < createPayload.partCount; index++) {
      const start = index * createPayload.partSize;
      const end = Math.min(start + createPayload.partSize, bytes.byteLength);
      const partBytes = bytes.slice(start, end);
      const partResponse = await apiFetch(
        `/api/files/multipart/part?uploadId=${encodeURIComponent(createPayload.uploadId)}&partNumber=${
          index + 1
        }`,
        {
          method: "PUT",
          headers: {
            "Content-Length": String(partBytes.byteLength),
            "Content-Type": "application/octet-stream",
          },
          body: partBytes,
        },
        cookie,
      );
      const partPayload = (await partResponse.json()) as MultipartUploadPartResponse;

      expect(partResponse.status).toBe(200);
      expect(partPayload.uploadedBytes).toBe(partBytes.byteLength);
      uploadedParts.push(partPayload.part);
    }

    const completeResponse = await apiFetch(
      "/api/files/multipart/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: createPayload.uploadId,
          parts: uploadedParts,
        }),
      },
      cookie,
    );

    expect(completeResponse.status).toBe(201);
    expect(await env.FILE_YARD_KV.get(`multipart-upload:${createPayload.uploadId}`)).toBeNull();

    const listResponse = await apiFetch("/api/files", {}, cookie);
    const list = (await listResponse.json()) as FileListResponse;
    expect(list.files).toContainEqual(
      expect.objectContaining({
        name: "large.bin",
        path: "large.bin",
        size: bytes.byteLength,
        contentType: "application/octet-stream",
      }),
    );

    const object = await env.FILES_BUCKET.head(`${await getRootDirId(userId)}/large.bin`);
    expect(object?.customMetadata).toMatchObject({ originalName: "large.bin" });

    const downloadResponse = await apiFetch("/api/files/object?path=large.bin", {}, cookie);
    const downloadedBytes = new Uint8Array(await downloadResponse.arrayBuffer());

    expect(downloadResponse.status).toBe(200);
    expect(downloadedBytes.byteLength).toBe(bytes.byteLength);
    expect(downloadedBytes[0]).toBe(11);
    expect(downloadedBytes[TEST_MULTIPART_PART_BYTES - 1]).toBe(22);
    expect(downloadedBytes[TEST_MULTIPART_PART_BYTES]).toBe(33);
    expect(downloadedBytes[TEST_MULTIPART_PART_BYTES + 2]).toBe(44);
  });

  it("rejects duplicate, invalid, mismatched, and aborted multipart uploads", async () => {
    const { cookie } = await createAuthenticatedUser();
    const existingUpload = await uploadTextFile("existing.txt", "existing", cookie);
    expect(existingUpload.status).toBe(201);

    const duplicateCreate = await apiFetch(
      "/api/files/multipart",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPath: "",
          name: "existing.txt",
          size: TEST_MULTIPART_PART_BYTES + 1,
          contentType: "text/plain",
        }),
      },
      cookie,
    );
    expect(duplicateCreate.status).toBe(409);

    const createResponse = await apiFetch(
      "/api/files/multipart",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPath: "",
          name: "abort-me.bin",
          size: TEST_MULTIPART_PART_BYTES + 1,
          contentType: "application/octet-stream",
        }),
      },
      cookie,
    );
    const createPayload = (await createResponse.json()) as MultipartUploadCreateResponse;
    expect(createResponse.status).toBe(201);

    const invalidPartResponse = await apiFetch(
      `/api/files/multipart/part?uploadId=${encodeURIComponent(createPayload.uploadId)}&partNumber=0`,
      {
        method: "PUT",
        headers: {
          "Content-Length": "1",
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array([1]),
      },
      cookie,
    );
    expect(invalidPartResponse.status).toBe(400);

    const mismatchedPartResponse = await apiFetch(
      `/api/files/multipart/part?uploadId=${encodeURIComponent(createPayload.uploadId)}&partNumber=1`,
      {
        method: "PUT",
        headers: {
          "Content-Length": "1",
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array([1]),
      },
      cookie,
    );
    expect(mismatchedPartResponse.status).toBe(400);

    const abortResponse = await apiFetch(
      `/api/files/multipart?uploadId=${encodeURIComponent(createPayload.uploadId)}`,
      { method: "DELETE" },
      cookie,
    );
    expect(abortResponse.status).toBe(204);
    expect(await env.FILE_YARD_KV.get(`multipart-upload:${createPayload.uploadId}`)).toBeNull();

    const completeAfterAbortResponse = await apiFetch(
      "/api/files/multipart/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: createPayload.uploadId,
          parts: [],
        }),
      },
      cookie,
    );
    expect(completeAfterAbortResponse.status).toBe(404);
  });

  it("aborts complete when the parent folder was deleted during upload", async () => {
    const { cookie } = await createAuthenticatedUser();
    const folderResponse = await createFolder("docs", cookie);
    expect(folderResponse.status).toBe(201);

    const bytes = new Uint8Array(TEST_MULTIPART_PART_BYTES + 1);
    bytes[0] = 10;
    bytes[TEST_MULTIPART_PART_BYTES] = 20;

    const createResponse = await apiFetch(
      "/api/files/multipart",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPath: "docs",
          name: "large.bin",
          size: bytes.byteLength,
          contentType: "application/octet-stream",
        }),
      },
      cookie,
    );
    const createPayload = (await createResponse.json()) as MultipartUploadCreateResponse;
    expect(createResponse.status).toBe(201);

    const uploadedParts: MultipartUploadPart[] = [];
    for (let index = 0; index < createPayload.partCount; index++) {
      const start = index * createPayload.partSize;
      const end = Math.min(start + createPayload.partSize, bytes.byteLength);
      const partBytes = bytes.slice(start, end);
      const partResponse = await apiFetch(
        `/api/files/multipart/part?uploadId=${encodeURIComponent(createPayload.uploadId)}&partNumber=${
          index + 1
        }`,
        {
          method: "PUT",
          headers: {
            "Content-Length": String(partBytes.byteLength),
            "Content-Type": "application/octet-stream",
          },
          body: partBytes,
        },
        cookie,
      );
      const partPayload = (await partResponse.json()) as MultipartUploadPartResponse;
      expect(partResponse.status).toBe(200);
      uploadedParts.push(partPayload.part);
    }

    const deleteFolderResponse = await apiFetch(
      "/api/files/folders?path=docs",
      { method: "DELETE" },
      cookie,
    );
    expect(deleteFolderResponse.status).toBe(200);

    const completeResponse = await apiFetch(
      "/api/files/multipart/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: createPayload.uploadId,
          parts: uploadedParts,
        }),
      },
      cookie,
    );
    const completePayload = (await completeResponse.json()) as { error?: string };

    expect(completeResponse.status).toBe(404);
    expect(completePayload.error).toBe("Parent folder not found");
    expect(await env.FILE_YARD_KV.get(`multipart-upload:${createPayload.uploadId}`)).toBeNull();

    const rootListResponse = await apiFetch("/api/files", {}, cookie);
    const rootList = (await rootListResponse.json()) as FileListResponse;
    expect(rootList.folders).not.toContainEqual(expect.objectContaining({ path: "docs" }));
    expect(rootList.files).not.toContainEqual(expect.objectContaining({ path: "docs/large.bin" }));
  });

  it("rejects multipart completion when another upload fills the user's remaining storage", async () => {
    const { cookie, userId } = await createAuthenticatedUser();
    await env.FILE_YARD_KV.put(
      "upload-plan:multipart-tight",
      JSON.stringify({
        key: "multipart-tight",
        label: "Multipart Tight",
        maxFileBytes: TEST_MULTIPART_PART_BYTES * 2,
        maxFilesPerUpload: 50,
        maxTotalBytes: TEST_MULTIPART_PART_BYTES + 4,
      }),
    );
    await setUserUploadPlan(userId, "multipart-tight");

    const bytes = new Uint8Array(TEST_MULTIPART_PART_BYTES + 3);
    const createResponse = await apiFetch(
      "/api/files/multipart",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentPath: "",
          name: "large.bin",
          size: bytes.byteLength,
          contentType: "application/octet-stream",
        }),
      },
      cookie,
    );
    const createPayload = (await createResponse.json()) as MultipartUploadCreateResponse;
    expect(createResponse.status).toBe(201);

    const uploadedParts: MultipartUploadPart[] = [];
    for (let index = 0; index < createPayload.partCount; index++) {
      const start = index * createPayload.partSize;
      const end = Math.min(start + createPayload.partSize, bytes.byteLength);
      const partBytes = bytes.slice(start, end);
      const partResponse = await apiFetch(
        `/api/files/multipart/part?uploadId=${encodeURIComponent(createPayload.uploadId)}&partNumber=${
          index + 1
        }`,
        {
          method: "PUT",
          headers: {
            "Content-Length": String(partBytes.byteLength),
            "Content-Type": "application/octet-stream",
          },
          body: partBytes,
        },
        cookie,
      );
      const partPayload = (await partResponse.json()) as MultipartUploadPartResponse;
      expect(partResponse.status).toBe(200);
      uploadedParts.push(partPayload.part);
    }

    const fillerResponse = await uploadTextFile("filler.txt", "xx", cookie);
    expect(fillerResponse.status).toBe(201);

    const completeResponse = await apiFetch(
      "/api/files/multipart/complete",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uploadId: createPayload.uploadId,
          parts: uploadedParts,
        }),
      },
      cookie,
    );

    expect(completeResponse.status).toBe(413);
    expect(await env.FILE_YARD_KV.get(`multipart-upload:${createPayload.uploadId}`)).toBeNull();

    const object = await env.FILES_BUCKET.head(`${await getRootDirId(userId)}/large.bin`);
    expect(object).toBeNull();
  });
});
