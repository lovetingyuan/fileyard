import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { AppContext } from "../src/worker/context";
import files from "../src/worker/routes/files";
import { getFolderMarkerKey } from "../src/worker/utils/fileManager";

const ROOT_DIR_ID = "root-dir";

class FakeBucket {
  readonly keys = new Set<string>();
  readonly putCalls: string[] = [];

  async head(key: string): Promise<R2Object | null> {
    if (!this.keys.has(key)) {
      return null;
    }

    return {
      key,
      version: "version",
      size: 0,
      etag: "etag",
      httpEtag: '"etag"',
      uploaded: new Date("2026-01-01T00:00:00.000Z"),
      customMetadata: { kind: "folder-marker" },
      httpMetadata: {},
      checksums: {},
      writeHttpMetadata: () => undefined,
    } as R2Object;
  }

  async list(options?: R2ListOptions): Promise<R2Objects> {
    const prefix = options?.prefix ?? "";
    const objects = [...this.keys]
      .filter((key) => key.startsWith(prefix))
      .map((key) => ({
        key,
        version: "version",
        size: 0,
        etag: "etag",
        httpEtag: '"etag"',
        uploaded: new Date("2026-01-01T00:00:00.000Z"),
        customMetadata: { kind: "folder-marker" },
        httpMetadata: {},
        checksums: {},
        writeHttpMetadata: () => undefined,
      })) as R2Object[];

    return {
      objects,
      delimitedPrefixes: [],
      truncated: false,
    };
  }

  async put(key: string): Promise<R2Object | null> {
    this.putCalls.push(key);
    if (this.keys.has(key)) {
      return null;
    }

    this.keys.add(key);
    return this.head(key);
  }
}

function createApp(bucket: FakeBucket) {
  const app = new Hono<AppContext>();

  app.use("*", async (c, next) => {
    c.set("user", {
      id: "user-id",
      email: "user@example.com",
      name: "User",
      emailVerified: true,
    });
    c.set("session", {
      id: "session-id",
      userId: "user-id",
      token: "token",
      expiresAt: new Date("2026-01-02T00:00:00.000Z"),
    });
    c.set("appProfile", {
      userId: "user-id",
      rootDirId: ROOT_DIR_ID,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    await next();
  });
  app.route("/", files);

  const env = {
    FILES_BUCKET: bucket,
  } as unknown as AppContext["Bindings"];

  return {
    postFolder: (body: unknown) =>
      app.request(
        "/api/files/folders",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        env,
      ),
  };
}

describe("folder ensure API", () => {
  it("returns success for existing folders only when ensure mode is requested", async () => {
    const bucket = new FakeBucket();
    bucket.keys.add(getFolderMarkerKey(ROOT_DIR_ID, "Photos"));
    const app = createApp(bucket);

    const ensureResponse = await app.postFolder({ parentPath: "", name: "Photos", ensure: true });
    expect(ensureResponse.status).toBe(200);
    await expect(ensureResponse.json()).resolves.toMatchObject({
      success: true,
      message: "Folder already exists",
    });

    const createResponse = await app.postFolder({ parentPath: "", name: "Photos" });
    expect(createResponse.status).toBe(409);
    await expect(createResponse.json()).resolves.toMatchObject({
      success: false,
      error: "A folder with this name already exists",
    });
  });

  it("still creates missing folders in ensure mode", async () => {
    const bucket = new FakeBucket();
    const app = createApp(bucket);

    const response = await app.postFolder({ parentPath: "", name: "Photos", ensure: true });

    expect(response.status).toBe(201);
    expect(bucket.putCalls).toEqual([getFolderMarkerKey(ROOT_DIR_ID, "Photos")]);
  });

  it("allows ordinary dot-prefixed folders while rejecting reserved system folders", async () => {
    const bucket = new FakeBucket();
    const app = createApp(bucket);

    const hiddenResponse = await app.postFolder({ parentPath: "", name: ".hidden" });
    expect(hiddenResponse.status).toBe(201);
    expect(bucket.putCalls).toContain(getFolderMarkerKey(ROOT_DIR_ID, ".hidden"));

    const userResponse = await app.postFolder({ parentPath: "", name: ".user" });
    expect(userResponse.status).toBe(403);
    await expect(userResponse.json()).resolves.toMatchObject({
      success: false,
      error: "Path uses a reserved system directory",
    });
  });
});
