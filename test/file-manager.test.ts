/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { runInDurableObject, SELF } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import type { FileListResponse, ProfileResponse } from "../src/types";
import type { User } from "../src/worker/types";
import { generateSalt, hashPassword } from "../src/worker/utils/password";

const TINY_PNG_BYTES = new Uint8Array([
  137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0,
  0, 31, 21, 196, 137, 0, 0, 0, 13, 73, 68, 65, 84, 120, 156, 99, 248, 207, 192, 240, 31, 0, 5, 0,
  1, 255, 137, 153, 61, 29, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130,
]);

function createEmailAddress(): string {
  return `user-${crypto.randomUUID()}@example.com`;
}

async function createVerifiedUser(email = createEmailAddress(), password = "Password123A") {
  const stub = env.USER_DO.getByName(email);
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const result = await stub.createUser(email, passwordHash, salt);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to create user");
  }

  await stub.verifyEmail();

  return {
    email,
    password,
    stub,
    user: await stub.getUser(),
  };
}

async function createSessionCookie(email: string): Promise<string> {
  const stub = env.USER_DO.getByName(email);
  const session = await stub.createSession();
  return `session_token=${session.token}; user_email=${email}`;
}

async function apiFetch(path: string, init: RequestInit = {}, cookie?: string): Promise<Response> {
  const headers = new Headers(init.headers);

  if (cookie) {
    headers.set("Cookie", cookie);
  }

  if (init.method && init.method !== "GET" && init.method !== "HEAD") {
    headers.set("Origin", "https://example.com");
  }

  const response = await SELF.fetch(`https://example.com${path}`, {
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

describe("authenticated R2 file manager", () => {
  it("rejects unauthenticated list, download, and delete requests", async () => {
    const listResponse = await apiFetch("/api/files");
    const downloadResponse = await apiFetch("/api/files/object?path=hello.txt");
    const deleteResponse = await apiFetch("/api/files/object?path=hello.txt", {
      method: "DELETE",
    });
    const profileResponse = await apiFetch("/api/profile");
    const avatarResponse = await apiFetch("/api/profile/avatar");

    expect(listResponse.status).toBe(401);
    expect(downloadResponse.status).toBe(401);
    expect(deleteResponse.status).toBe(401);
    expect(profileResponse.status).toBe(401);
    expect(avatarResponse.status).toBe(401);
  });

  it("backfills rootDirId for existing users on first file access", async () => {
    const { email, stub } = await createVerifiedUser();

    await runInDurableObject(stub, async (_instance, state) => {
      const storedUser = await state.storage.get<User>("user");
      if (!storedUser) {
        throw new Error("Expected user to exist");
      }

      delete storedUser.rootDirId;
      await state.storage.put("user", storedUser);
    });

    const cookie = await createSessionCookie(email);
    const response = await apiFetch("/api/files", {}, cookie);
    const payload = (await response.json()) as FileListResponse;
    const updatedUser = await stub.getUser();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(updatedUser?.rootDirId).toMatch(/^[a-f0-9]{32}$/);
  });

  it("creates folders and supports file upload, list, download, and delete", async () => {
    const { email } = await createVerifiedUser();
    const cookie = await createSessionCookie(email);

    const createFolderResponse = await apiFetch(
      "/api/files/folders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "docs",
          parentPath: "",
        }),
      },
      cookie,
    );

    expect(createFolderResponse.status).toBe(201);

    const rootListResponse = await apiFetch("/api/files", {}, cookie);
    const rootList = (await rootListResponse.json()) as FileListResponse;

    expect(rootList.folders).toHaveLength(1);
    expect(rootList.folders[0]).toMatchObject({ name: "docs", path: "docs" });
    expect(rootList.folders[0]?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

    const fileContents = "hello world";
    const uploadResponse = await apiFetch(
      "/api/files/object?parentPath=docs&name=hello.txt",
      {
        method: "PUT",
        headers: {
          "Content-Length": String(fileContents.length),
          "Content-Type": "text/plain",
        },
        body: fileContents,
      },
      cookie,
    );

    expect(uploadResponse.status).toBe(201);

    const folderListResponse = await apiFetch("/api/files?path=docs", {}, cookie);
    const folderList = (await folderListResponse.json()) as FileListResponse;

    expect(folderList.files).toHaveLength(1);
    expect(folderList.files[0]).toMatchObject({
      name: "hello.txt",
      path: "docs/hello.txt",
      size: fileContents.length,
      createdAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      uploadedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      contentType: "text/plain",
    });

    const downloadResponse = await apiFetch("/api/files/object?path=docs/hello.txt", {}, cookie);
    const downloadedText = await downloadResponse.text();

    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("Content-Disposition")).toContain("attachment;");
    expect(downloadResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(downloadedText).toBe(fileContents);

    const deleteResponse = await apiFetch(
      "/api/files/object?path=docs/hello.txt",
      {
        method: "DELETE",
      },
      cookie,
    );

    expect(deleteResponse.status).toBe(200);

    const afterDeleteResponse = await apiFetch("/api/files?path=docs", {}, cookie);
    const afterDeleteList = (await afterDeleteResponse.json()) as FileListResponse;

    expect(afterDeleteList.files).toHaveLength(0);
  });

  it("enforces path validation, collision checks, upload limits, and user isolation", async () => {
    const firstUser = await createVerifiedUser();
    const firstCookie = await createSessionCookie(firstUser.email);

    const secondUser = await createVerifiedUser();
    const secondCookie = await createSessionCookie(secondUser.email);

    const invalidPathResponse = await apiFetch("/api/files?path=/", {}, firstCookie);
    expect(invalidPathResponse.status).toBe(400);

    const reservedFolderResponse = await apiFetch(
      "/api/files/folders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: ".fileshare-folder",
          parentPath: "",
        }),
      },
      firstCookie,
    );
    expect(reservedFolderResponse.status).toBe(400);

    const hiddenFolderResponse = await apiFetch(
      "/api/files/folders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: ".hidden",
          parentPath: "",
        }),
      },
      firstCookie,
    );
    expect(hiddenFolderResponse.status).toBe(400);

    const createFolderResponse = await apiFetch(
      "/api/files/folders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "docs",
          parentPath: "",
        }),
      },
      firstCookie,
    );
    expect(createFolderResponse.status).toBe(201);

    const folderCollisionResponse = await apiFetch(
      "/api/files/object?name=docs",
      {
        method: "PUT",
        headers: {
          "Content-Length": String("collision".length),
          "Content-Type": "text/plain",
        },
        body: "collision",
      },
      firstCookie,
    );
    expect(folderCollisionResponse.status).toBe(409);

    const uploadFileResponse = await apiFetch(
      "/api/files/object?name=report.txt",
      {
        method: "PUT",
        headers: {
          "Content-Length": String("report".length),
          "Content-Type": "text/plain",
        },
        body: "report",
      },
      firstCookie,
    );
    expect(uploadFileResponse.status).toBe(201);

    const fileCollisionResponse = await apiFetch(
      "/api/files/folders",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "report.txt",
          parentPath: "",
        }),
      },
      firstCookie,
    );
    expect(fileCollisionResponse.status).toBe(409);

    const oversizedUploadResponse = await apiFetch(
      "/api/files/object?name=too-large.bin",
      {
        method: "PUT",
        headers: {
          "Content-Length": String(Number.parseInt(env.MAX_UPLOAD_BYTES, 10) + 1),
          "Content-Type": "application/octet-stream",
        },
        body: new Uint8Array(Number.parseInt(env.MAX_UPLOAD_BYTES, 10) + 1),
      },
      firstCookie,
    );
    expect(oversizedUploadResponse.status).toBe(413);

    const isolatedPath = `${firstUser.user?.rootDirId}/report.txt`;
    const isolationResponse = await apiFetch(
      `/api/files/object?path=${encodeURIComponent(isolatedPath)}`,
      {},
      secondCookie,
    );
    expect(isolationResponse.status).toBe(404);

    const reservedPathResponse = await apiFetch(
      "/api/files/object?path=.user/avatar.png",
      {},
      firstCookie,
    );
    expect(reservedPathResponse.status).toBe(403);
  });

  it("serves profile data and stores avatars outside the main file manager", async () => {
    const firstUser = await createVerifiedUser();
    const firstCookie = await createSessionCookie(firstUser.email);
    const secondUser = await createVerifiedUser();
    const secondCookie = await createSessionCookie(secondUser.email);

    const initialProfileResponse = await apiFetch("/api/profile", {}, firstCookie);
    const initialProfile = (await initialProfileResponse.json()) as ProfileResponse;
    const missingAvatarResponse = await apiFetch("/api/profile/avatar", {}, firstCookie);

    expect(initialProfileResponse.status).toBe(200);
    expect(initialProfile.profile).toEqual({
      email: firstUser.email,
      avatarUrl: null,
    });
    expect(missingAvatarResponse.status).toBe(404);
    await missingAvatarResponse.text();

    const invalidTypeResponse = await apiFetch(
      "/api/profile/avatar",
      {
        method: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
        },
        body: "not-a-png",
      },
      firstCookie,
    );
    expect(invalidTypeResponse.status).toBe(400);
    await invalidTypeResponse.text();

    const oversizedAvatarResponse = await apiFetch(
      "/api/profile/avatar",
      {
        method: "PUT",
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(1024 * 1024 + 1),
        },
        body: new Uint8Array(1024 * 1024 + 1),
      },
      firstCookie,
    );
    expect(oversizedAvatarResponse.status).toBe(413);
    await oversizedAvatarResponse.text();

    const uploadAvatarResponse = await apiFetch(
      "/api/profile/avatar",
      {
        method: "PUT",
        headers: {
          "Content-Type": "image/png",
        },
        body: TINY_PNG_BYTES,
      },
      firstCookie,
    );
    expect(uploadAvatarResponse.status).toBe(200);
    await uploadAvatarResponse.text();

    const profileAfterUploadResponse = await apiFetch("/api/profile", {}, firstCookie);
    const profileAfterUpload = (await profileAfterUploadResponse.json()) as ProfileResponse;

    expect(profileAfterUpload.profile.email).toBe(firstUser.email);
    expect(profileAfterUpload.profile.avatarUrl).toMatch(/^\/api\/profile\/avatar\?v=/);

    const avatarResponse = await apiFetch("/api/profile/avatar", {}, firstCookie);
    const avatarBytes = new Uint8Array(await avatarResponse.arrayBuffer());

    expect(avatarResponse.status).toBe(200);
    expect(avatarResponse.headers.get("Content-Type")).toContain("image/png");
    expect(avatarResponse.headers.get("Cache-Control")).toBe("private, max-age=3600");
    expect(Array.from(avatarBytes)).toEqual(Array.from(TINY_PNG_BYTES));

    const secondUserAvatarResponse = await apiFetch("/api/profile/avatar", {}, secondCookie);
    expect(secondUserAvatarResponse.status).toBe(404);
    await secondUserAvatarResponse.text();

    const rootListResponse = await apiFetch("/api/files", {}, firstCookie);
    const rootList = (await rootListResponse.json()) as FileListResponse;
    expect(rootList.folders.some((folder) => folder.name === ".user")).toBe(false);

    const reservedFolderDeleteResponse = await apiFetch(
      "/api/files/folders?path=.user",
      {
        method: "DELETE",
      },
      firstCookie,
    );
    expect(reservedFolderDeleteResponse.status).toBe(403);
    await reservedFolderDeleteResponse.text();
  });

  it("falls back to marker upload time when folder metadata predates createdAt", async () => {
    const { email, user } = await createVerifiedUser();
    const cookie = await createSessionCookie(email);
    const rootDirId = user?.rootDirId;

    if (!rootDirId) {
      throw new Error("Expected rootDirId to be set");
    }

    await env.FILES_BUCKET.put(`${rootDirId}/legacy/.fileshare-folder`, new Uint8Array(), {
      customMetadata: { kind: "folder-marker" },
    });

    const listResponse = await apiFetch("/api/files", {}, cookie);
    const list = (await listResponse.json()) as FileListResponse;
    const legacyFolder = list.folders.find((folder) => folder.path === "legacy");

    expect(listResponse.status).toBe(200);
    expect(legacyFolder).toBeDefined();
    expect(legacyFolder?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it("preserves file createdAt on overwrite and falls back for legacy file metadata", async () => {
    const { email, user } = await createVerifiedUser();
    const cookie = await createSessionCookie(email);
    const rootDirId = user?.rootDirId;

    if (!rootDirId) {
      throw new Error("Expected rootDirId to be set");
    }

    const initialUploadResponse = await apiFetch(
      "/api/files/object?name=notes.txt",
      {
        method: "PUT",
        headers: {
          "Content-Length": String("first".length),
          "Content-Type": "text/plain",
        },
        body: "first",
      },
      cookie,
    );
    expect(initialUploadResponse.status).toBe(201);

    const initialListResponse = await apiFetch("/api/files", {}, cookie);
    const initialList = (await initialListResponse.json()) as FileListResponse;
    const initialFile = initialList.files.find((file) => file.path === "notes.txt");

    expect(initialFile).toBeDefined();
    expect(initialFile?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(initialFile?.uploadedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    await env.FILES_BUCKET.put(`${rootDirId}/legacy.txt`, "legacy", {
      customMetadata: { originalName: "legacy.txt" },
      httpMetadata: { contentType: "text/plain" },
    });

    const overwriteResponse = await apiFetch(
      "/api/files/object?name=notes.txt&overwrite=true",
      {
        method: "PUT",
        headers: {
          "Content-Length": String("second version".length),
          "Content-Type": "text/plain",
        },
        body: "second version",
      },
      cookie,
    );
    expect(overwriteResponse.status).toBe(201);

    const updatedListResponse = await apiFetch("/api/files", {}, cookie);
    const updatedList = (await updatedListResponse.json()) as FileListResponse;
    const updatedFile = updatedList.files.find((file) => file.path === "notes.txt");
    const legacyFile = updatedList.files.find((file) => file.path === "legacy.txt");

    expect(updatedFile).toBeDefined();
    expect(updatedFile?.createdAt).toBe(initialFile?.createdAt);
    expect(Date.parse(updatedFile?.uploadedAt ?? "")).toBeGreaterThanOrEqual(
      Date.parse(initialFile?.uploadedAt ?? ""),
    );

    expect(legacyFile).toBeDefined();
    expect(legacyFile?.createdAt).toBe(legacyFile?.uploadedAt);
  });

  it("sorts folders by created time when sorting by time while keeping files separate", async () => {
    const { email, user } = await createVerifiedUser();
    const cookie = await createSessionCookie(email);
    const rootDirId = user?.rootDirId;

    if (!rootDirId) {
      throw new Error("Expected rootDirId to be set");
    }

    await env.FILES_BUCKET.put(`${rootDirId}/older/.fileshare-folder`, new Uint8Array(), {
      customMetadata: { kind: "folder-marker", createdAt: "2026-01-01T00:00:00.000Z" },
    });
    await env.FILES_BUCKET.put(`${rootDirId}/newer/.fileshare-folder`, new Uint8Array(), {
      customMetadata: { kind: "folder-marker", createdAt: "2026-02-01T00:00:00.000Z" },
    });
    await env.FILES_BUCKET.put(`${rootDirId}/report.txt`, "report", {
      customMetadata: { originalName: "report.txt" },
      httpMetadata: { contentType: "text/plain" },
    });

    const descResponse = await apiFetch("/api/files?sort=uploadedAt&order=desc", {}, cookie);
    const descList = (await descResponse.json()) as FileListResponse;

    expect(descResponse.status).toBe(200);
    expect(descList.folders.map((folder) => folder.name)).toEqual(["newer", "older"]);
    expect(descList.files.map((file) => file.name)).toEqual(["report.txt"]);

    const ascResponse = await apiFetch("/api/files?sort=uploadedAt&order=asc", {}, cookie);
    const ascList = (await ascResponse.json()) as FileListResponse;

    expect(ascResponse.status).toBe(200);
    expect(ascList.folders.map((folder) => folder.name)).toEqual(["older", "newer"]);
    expect(ascList.files.map((file) => file.name)).toEqual(["report.txt"]);
  });
});
