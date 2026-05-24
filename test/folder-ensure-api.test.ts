import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { AppContext } from "../src/worker/context";
import files from "../src/worker/routes/files";
import { getFileKey, getFolderMarkerKey } from "../src/worker/utils/fileManager";

const ROOT_DIR_ID = "root-dir";

type FakeObjectData = {
  value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob;
  httpMetadata?: R2HTTPMetadata | Headers;
  customMetadata?: Record<string, string>;
  uploaded: Date;
};

class FakeBucket {
  readonly keys = new Set<string>();
  readonly objects = new Map<string, FakeObjectData>();
  readonly putCalls: string[] = [];

  private toObject(key: string): R2Object {
    const data = this.objects.get(key);
    return {
      key,
      version: "version",
      size: typeof data?.value === "string" ? data.value.length : 0,
      etag: `etag:${key}`,
      httpEtag: `"etag:${key}"`,
      uploaded: data?.uploaded ?? new Date("2026-01-01T00:00:00.000Z"),
      customMetadata: data?.customMetadata ?? { kind: "folder-marker" },
      httpMetadata: data?.httpMetadata instanceof Headers ? {} : (data?.httpMetadata ?? {}),
      checksums: {},
      storageClass: "Standard",
      writeHttpMetadata: (headers: Headers) => {
        const metadata = data?.httpMetadata;
        if (metadata instanceof Headers) {
          for (const [name, value] of metadata) {
            headers.set(name, value);
          }
          return;
        }
        if (metadata?.contentType) {
          headers.set("Content-Type", metadata.contentType);
        }
      },
    } as R2Object;
  }

  async head(key: string): Promise<R2Object | null> {
    if (!this.keys.has(key)) {
      return null;
    }

    return this.toObject(key);
  }

  async get(key: string): Promise<R2ObjectBody | null> {
    const data = this.objects.get(key);
    if (!data && !this.keys.has(key)) {
      return null;
    }

    const object = this.toObject(key);
    const body = new Response(data?.value ?? new Uint8Array()).body;
    if (!body) {
      throw new Error("Expected body");
    }

    return {
      ...object,
      body,
      bodyUsed: false,
      arrayBuffer: () => new Response(data?.value ?? new Uint8Array()).arrayBuffer(),
      bytes: async () => new Uint8Array(await new Response(data?.value ?? new Uint8Array()).arrayBuffer()),
      text: () => new Response(data?.value ?? new Uint8Array()).text(),
      json: <T>() => new Response(data?.value ?? new Uint8Array()).json() as Promise<T>,
      blob: () => new Response(data?.value ?? new Uint8Array()).blob(),
    } as R2ObjectBody;
  }

  async list(options?: R2ListOptions): Promise<R2Objects> {
    const prefix = options?.prefix ?? "";
    const objects = [...this.keys]
      .filter((key) => key.startsWith(prefix))
      .map((key) => ({
        key,
        version: "version",
        size: 0,
        ...this.toObject(key),
      })) as R2Object[];

    return {
      objects,
      delimitedPrefixes: [],
      truncated: false,
    };
  }

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | null | Blob = null,
    options?: R2PutOptions,
  ): Promise<R2Object | null> {
    this.putCalls.push(key);
    if (this.keys.has(key) && options?.onlyIf instanceof Headers) {
      return null;
    }

    this.keys.add(key);
    this.objects.set(key, {
      value,
      customMetadata: options?.customMetadata,
      httpMetadata: options?.httpMetadata,
      uploaded: new Date("2026-01-01T00:00:00.000Z"),
    });
    return this.head(key);
  }

  async delete(keys: string | string[]): Promise<void> {
    for (const key of Array.isArray(keys) ? keys : [keys]) {
      this.keys.delete(key);
      this.objects.delete(key);
    }
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
    patchFile: (body: unknown) =>
      app.request(
        "/api/files/object",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        env,
      ),
    patchFolder: (body: unknown) =>
      app.request(
        "/api/files/folders",
        {
          method: "PATCH",
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

  it("renames a file by moving it to the new object key", async () => {
    const bucket = new FakeBucket();
    await bucket.put(getFileKey(ROOT_DIR_ID, "notes.txt"), "draft", {
      customMetadata: { originalName: "notes.txt", createdAt: "2026-01-01T00:00:00.000Z" },
      httpMetadata: { contentType: "text/plain" },
    });
    const app = createApp(bucket);

    const response = await app.patchFile({ path: "notes.txt", name: "renamed.txt" });

    expect(response.status).toBe(200);
    expect(await bucket.head(getFileKey(ROOT_DIR_ID, "notes.txt"))).toBeNull();
    const renamed = await bucket.get(getFileKey(ROOT_DIR_ID, "renamed.txt"));
    expect(await renamed?.text()).toBe("draft");
    expect(renamed?.customMetadata).toMatchObject({
      originalName: "renamed.txt",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });

  it("renames a folder by moving every object under the old prefix", async () => {
    const bucket = new FakeBucket();
    await bucket.put(getFolderMarkerKey(ROOT_DIR_ID, "docs"), new Uint8Array(), {
      customMetadata: { kind: "folder-marker", createdAt: "2026-01-01T00:00:00.000Z" },
    });
    await bucket.put(getFolderMarkerKey(ROOT_DIR_ID, "docs/projects"), new Uint8Array(), {
      customMetadata: { kind: "folder-marker", createdAt: "2026-01-02T00:00:00.000Z" },
    });
    await bucket.put(getFileKey(ROOT_DIR_ID, "docs/projects/readme.md"), "hello", {
      customMetadata: { originalName: "readme.md", createdAt: "2026-01-03T00:00:00.000Z" },
      httpMetadata: { contentType: "text/markdown" },
    });
    const app = createApp(bucket);

    const response = await app.patchFolder({ path: "docs", name: "archive" });

    expect(response.status).toBe(200);
    expect(await bucket.head(getFolderMarkerKey(ROOT_DIR_ID, "docs"))).toBeNull();
    expect(await bucket.head(getFolderMarkerKey(ROOT_DIR_ID, "archive"))).toBeTruthy();
    expect(await bucket.head(getFolderMarkerKey(ROOT_DIR_ID, "archive/projects"))).toBeTruthy();
    const movedFile = await bucket.get(getFileKey(ROOT_DIR_ID, "archive/projects/readme.md"));
    expect(await movedFile?.text()).toBe("hello");
    expect(movedFile?.customMetadata).toMatchObject({
      originalName: "readme.md",
      createdAt: "2026-01-03T00:00:00.000Z",
    });
  });

  it("rejects rename collisions and unchanged names", async () => {
    const bucket = new FakeBucket();
    await bucket.put(getFolderMarkerKey(ROOT_DIR_ID, "docs"), new Uint8Array(), {
      customMetadata: { kind: "folder-marker" },
    });
    await bucket.put(getFileKey(ROOT_DIR_ID, "report.txt"), "report", {
      customMetadata: { originalName: "report.txt" },
      httpMetadata: { contentType: "text/plain" },
    });
    const app = createApp(bucket);

    const unchangedResponse = await app.patchFile({ path: "report.txt", name: "report.txt" });
    expect(unchangedResponse.status).toBe(400);
    await expect(unchangedResponse.json()).resolves.toMatchObject({
      success: false,
      error: "New file name must be different",
    });

    const folderCollisionResponse = await app.patchFile({ path: "report.txt", name: "docs" });
    expect(folderCollisionResponse.status).toBe(409);

    const fileCollisionResponse = await app.patchFolder({ path: "docs", name: "report.txt" });
    expect(fileCollisionResponse.status).toBe(409);
  });
});
