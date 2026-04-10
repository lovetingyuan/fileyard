import { Hono } from "hono";
import type { AppContext } from "../context";
import type { DirectoryStatsResponse, FileListResponse, FileMutationResponse } from "../../types";
import {
  FilePathValidationError,
  FOLDER_MARKER_NAME,
  SYSTEM_PROFILE_FOLDER_NAME,
  getBaseName,
  getFileKey,
  getFolderMarkerKey,
  getFolderPrefix,
  isReservedSystemPath,
  joinRelativePath,
  normalizeName,
  normalizeRelativePath,
  toContentDisposition,
} from "../utils/fileManager";
import {
  createUploadStream,
  folderExists,
  getFileContext,
  getUploadLimitBytes,
} from "../utils/appHelpers";
import { UploadTooLargeError, handlePathValidationError, jsonError } from "../utils/response";

const files = new Hono<AppContext>();

async function getFolderCreatedAt(
  bucket: R2Bucket,
  rootDirId: string,
  folderPath: string,
): Promise<string> {
  const marker = await bucket.head(getFolderMarkerKey(rootDirId, folderPath));
  const markerCreatedAt = marker?.customMetadata?.createdAt ?? marker?.uploaded.toISOString();
  if (markerCreatedAt) {
    return markerCreatedAt;
  }

  const fallbackListing = await bucket.list({
    prefix: getFolderPrefix(rootDirId, folderPath),
    limit: 1,
  });
  const fallbackObject = fallbackListing.objects[0];
  if (fallbackObject) {
    return fallbackObject.uploaded.toISOString();
  }

  throw new Error(`Folder metadata missing for ${folderPath}`);
}

function resolveFileCreatedAt(object: Pick<R2Object, "uploaded" | "customMetadata">): string {
  return object.customMetadata?.createdAt ?? object.uploaded.toISOString();
}

function assertPathNotReserved(path: string): void {
  if (isReservedSystemPath(path)) {
    throw new FilePathValidationError("Path uses a reserved system directory", 403);
  }
}

function assertFolderNameAllowed(name: string): void {
  if (name.startsWith(".")) {
    throw new FilePathValidationError('Folder name cannot start with "."');
  }
}

files.get("/api/files", async (c) => {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: true, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);

    if (path && !(await folderExists(c.env, rootDirId, path))) {
      return jsonError(c, "Folder not found", 404);
    }

    const sortParam = (c.req.query("sort") ?? "uploadedAt") as "name" | "size" | "uploadedAt";
    const orderParam = (c.req.query("order") ?? "desc") as "asc" | "desc";

    const prefix = getFolderPrefix(rootDirId, path);
    const allObjects: R2Object[] = [];
    const allPrefixes = new Set<string>();

    let cursor: string | undefined;
    do {
      const listing = await c.env.FILES_BUCKET.list({
        cursor,
        delimiter: "/",
        include: ["httpMetadata", "customMetadata"],
        prefix,
      });
      for (const obj of listing.objects) {
        allObjects.push(obj);
      }
      for (const p of listing.delimitedPrefixes) {
        allPrefixes.add(p);
      }
      cursor = listing.truncated ? listing.cursor : undefined;
    } while (cursor);

    const folderNames = [...allPrefixes]
      .map((folderPrefix) => folderPrefix.slice(prefix.length).replace(/\/$/, ""))
      .filter((name) => name !== SYSTEM_PROFILE_FOLDER_NAME)
      .filter(Boolean);

    const folders = await Promise.all(
      folderNames.map(async (name) => {
        const folderPath = joinRelativePath(path, name);
        return {
          name,
          path: folderPath,
          createdAt: await getFolderCreatedAt(c.env.FILES_BUCKET, rootDirId, folderPath),
        };
      }),
    );

    folders.sort((a, b) => {
      let cmp = 0;
      if (sortParam === "uploadedAt") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        cmp = a.name.localeCompare(b.name);
      }
      return orderParam === "desc" ? -cmp : cmp;
    });

    const fileItems = allObjects
      .filter((object) => object.key !== `${prefix}${FOLDER_MARKER_NAME}`)
      .map((object) => {
        const name = object.key.slice(prefix.length);
        return {
          name,
          path: joinRelativePath(path, name),
          size: object.size,
          createdAt: resolveFileCreatedAt(object),
          uploadedAt: object.uploaded.toISOString(),
          contentType: object.httpMetadata?.contentType ?? null,
        };
      });

    fileItems.sort((a, b) => {
      let cmp = 0;
      if (sortParam === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortParam === "size") {
        cmp = a.size - b.size;
      } else {
        cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      }
      return orderParam === "desc" ? -cmp : cmp;
    });

    const response: FileListResponse = {
      success: true,
      path,
      folders,
      files: fileItems,
    };

    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to list files", error);
    return jsonError(c, "Failed to list files", 500);
  }
});

files.get("/api/files/stats", async (c) => {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: true, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);

    if (path && !(await folderExists(c.env, rootDirId, path))) {
      return jsonError(c, "Folder not found", 404);
    }

    const prefix = getFolderPrefix(rootDirId, path);
    const systemPrefix = path ? null : getFolderPrefix(rootDirId, SYSTEM_PROFILE_FOLDER_NAME);
    let fileCount = 0;
    let totalBytes = 0;

    let cursor: string | undefined;
    do {
      const listing = await c.env.FILES_BUCKET.list({ prefix, cursor });
      for (const object of listing.objects) {
        if (object.key === `${prefix}${FOLDER_MARKER_NAME}`) {
          continue;
        }
        if (systemPrefix && object.key.startsWith(systemPrefix)) {
          continue;
        }
        fileCount += 1;
        totalBytes += object.size;
      }
      cursor = listing.truncated ? listing.cursor : undefined;
    } while (cursor);

    const response: DirectoryStatsResponse = {
      success: true,
      path,
      fileCount,
      totalBytes,
    };

    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to get directory stats", error);
    return jsonError(c, "Failed to get directory stats", 500);
  }
});

files.post("/api/files/folders", async (c) => {
  try {
    const body = await c.req.json<{ parentPath?: string; name?: string }>();
    const parentPath = normalizeRelativePath(body.parentPath, {
      allowEmpty: true,
      label: "Parent path",
    });
    assertPathNotReserved(parentPath);
    const name = normalizeName(body.name, "Folder name");
    assertFolderNameAllowed(name);
    const folderPath = joinRelativePath(parentPath, name);
    const { rootDirId } = await getFileContext(c);

    if (!(await folderExists(c.env, rootDirId, parentPath))) {
      return jsonError(c, "Parent folder not found", 404);
    }

    const fileCollision = await c.env.FILES_BUCKET.head(getFileKey(rootDirId, folderPath));
    if (fileCollision) {
      return jsonError(c, "A file with this name already exists", 409);
    }

    if (await folderExists(c.env, rootDirId, folderPath)) {
      return jsonError(c, "A folder with this name already exists", 409);
    }

    const markerKey = getFolderMarkerKey(rootDirId, folderPath);
    const createdAt = new Date().toISOString();
    const putResult = await c.env.FILES_BUCKET.put(markerKey, new Uint8Array(), {
      customMetadata: { kind: "folder-marker", createdAt },
      onlyIf: new Headers({ "If-None-Match": "*" }),
    });

    if (!putResult) {
      return jsonError(c, "A folder with this name already exists", 409);
    }

    const response: FileMutationResponse = {
      success: true,
      message: "Folder created successfully",
    };
    return c.json(response, 201);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to create folder", error);
    return jsonError(c, "Failed to create folder", 500);
  }
});

files.delete("/api/files/folders", async (c) => {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: false, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);

    if (!(await folderExists(c.env, rootDirId, path))) {
      return jsonError(c, "Folder not found", 404);
    }

    const prefix = getFolderPrefix(rootDirId, path);
    const keysToDelete: string[] = [];

    let cursor: string | undefined;
    do {
      const listing = await c.env.FILES_BUCKET.list({ prefix, cursor });
      for (const object of listing.objects) {
        keysToDelete.push(object.key);
      }
      cursor = listing.truncated ? listing.cursor : undefined;
    } while (cursor);

    // R2 delete accepts up to 1000 keys at a time
    for (let i = 0; i < keysToDelete.length; i += 1000) {
      await c.env.FILES_BUCKET.delete(keysToDelete.slice(i, i + 1000));
    }

    const response: FileMutationResponse = {
      success: true,
      message: "Folder deleted successfully",
    };
    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to delete folder", error);
    return jsonError(c, "Failed to delete folder", 500);
  }
});

files.put("/api/files/object", async (c) => {
  try {
    const parentPath = normalizeRelativePath(c.req.query("parentPath"), {
      allowEmpty: true,
      label: "Parent path",
    });
    assertPathNotReserved(parentPath);
    const name = normalizeName(c.req.query("name"), "File name");
    const filePath = joinRelativePath(parentPath, name);
    assertPathNotReserved(filePath);
    const { rootDirId } = await getFileContext(c);

    if (!(await folderExists(c.env, rootDirId, parentPath))) {
      return jsonError(c, "Parent folder not found", 404);
    }

    if (await folderExists(c.env, rootDirId, filePath)) {
      return jsonError(c, "A folder with this name already exists", 409);
    }

    const body = c.req.raw.body;
    if (!body) {
      return jsonError(c, "File body is required", 400);
    }

    const maxUploadBytes = getUploadLimitBytes(c.env);
    const contentLengthHeader = c.req.header("content-length");
    if (!contentLengthHeader) {
      return jsonError(c, "Content-Length header is required for uploads", 411);
    }

    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isFinite(contentLength) || contentLength < 0) {
      return jsonError(c, "Invalid Content-Length header", 400);
    }

    if (contentLength > maxUploadBytes) {
      return jsonError(c, "File exceeds the upload size limit", 413);
    }

    const uploadStream = createUploadStream(body as ReadableStream<Uint8Array>, maxUploadBytes);
    const fixedLengthStream = new FixedLengthStream(contentLength);
    const pipingPromise = uploadStream.pipeTo(fixedLengthStream.writable);
    const fileKey = getFileKey(rootDirId, filePath);
    const contentType = c.req.header("content-type") ?? "application/octet-stream";

    // Check if this is an update (allow overwrite) or new file
    const allowOverwrite = c.req.query("overwrite") === "true";
    const existingObject = allowOverwrite ? await c.env.FILES_BUCKET.head(fileKey) : null;
    const createdAt = existingObject
      ? resolveFileCreatedAt(existingObject)
      : new Date().toISOString();

    const putResult = await Promise.all([
      c.env.FILES_BUCKET.put(fileKey, fixedLengthStream.readable, {
        customMetadata: { originalName: name, createdAt },
        httpMetadata: { contentType },
        ...(allowOverwrite ? {} : { onlyIf: new Headers({ "If-None-Match": "*" }) }),
      }),
      pipingPromise,
    ]).then(([result]) => result);

    if (!putResult && !allowOverwrite) {
      return jsonError(c, "A file with this name already exists", 409);
    }

    const response: FileMutationResponse = { success: true, message: "File uploaded successfully" };
    return c.json(response, 201);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    if (error instanceof UploadTooLargeError) {
      return jsonError(c, error.message, 413);
    }
    console.error("Failed to upload file", error);
    return jsonError(c, "Failed to upload file", 500);
  }
});

files.get("/api/files/object", async (c) => {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: false, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);
    const object = await c.env.FILES_BUCKET.get(getFileKey(rootDirId, path));

    if (!object || !object.body) {
      return jsonError(c, "File not found", 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set(
      "Content-Disposition",
      toContentDisposition(object.customMetadata?.originalName ?? getBaseName(path)),
    );
    headers.set("ETag", object.httpEtag);
    headers.set("Last-Modified", object.uploaded.toUTCString());
    headers.set("X-Content-Type-Options", "nosniff");

    return new Response(object.body, { headers, status: 200 });
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to download file", error);
    return jsonError(c, "Failed to download file", 500);
  }
});

files.get("/api/files/preview", async (c) => {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: false, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);

    const object = await c.env.FILES_BUCKET.get(getFileKey(rootDirId, path), {
      range: c.req.raw.headers,
    });

    if (!object || !object.body) {
      return jsonError(c, "File not found", 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("Cache-Control", "private, no-store");
    headers.set("Content-Disposition", "inline");
    headers.set("ETag", object.httpEtag);
    headers.set("Last-Modified", object.uploaded.toUTCString());
    headers.set("Accept-Ranges", "bytes");
    // Sandbox previewed content to prevent script execution in HTML/SVG files
    headers.set("Content-Security-Policy", "sandbox");

    if (object.range) {
      const r = object.range;
      let start: number;
      let end: number;
      if ("suffix" in r) {
        start = object.size - r.suffix;
        end = object.size - 1;
      } else {
        start = r.offset ?? 0;
        end = r.length !== undefined ? start + r.length - 1 : object.size - 1;
      }
      headers.set("Content-Range", `bytes ${start}-${end}/${object.size}`);
      headers.set("Content-Length", String(end - start + 1));
      return new Response(object.body, { headers, status: 206 });
    }

    headers.set("Content-Length", String(object.size));
    return new Response(object.body, { headers, status: 200 });
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to preview file", error);
    return jsonError(c, "Failed to preview file", 500);
  }
});

files.delete("/api/files/object", async (c) => {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: false, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);
    const fileKey = getFileKey(rootDirId, path);
    const object = await c.env.FILES_BUCKET.head(fileKey);

    if (!object) {
      return jsonError(c, "File not found", 404);
    }

    await c.env.FILES_BUCKET.delete(fileKey);

    const response: FileMutationResponse = { success: true, message: "File deleted successfully" };
    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to delete file", error);
    return jsonError(c, "Failed to delete file", 500);
  }
});

export default files;
