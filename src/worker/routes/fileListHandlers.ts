import type { Context } from "hono";
import type {
  DirectoryStatsResponse,
  FileListResponse,
  FileUploadLimitsResponse,
} from "../../types";
import type { AppContext } from "../context";
import { folderExists, getFileContext, getUploadLimitBytes } from "../utils/appHelpers";
import {
  MULTIPART_UPLOAD_PART_BYTES,
  SYSTEM_PROFILE_FOLDER_NAME,
  getFolderPrefix,
  isFolderMarkerKey,
  joinRelativePath,
  normalizeRelativePath,
} from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import {
  MAX_BATCH_UPLOAD_BYTES,
  assertPathNotReserved,
  getFolderCreatedAt,
  resolveFileCreatedAt,
} from "./filesShared";
import { getFileChecksumMetadata } from "./fileChecksumMetadata";

type SortParams = {
  sort: "name" | "size" | "uploadedAt";
  order: "asc" | "desc";
};

function getSortParams(c: Context<AppContext>): SortParams {
  return {
    sort: (c.req.query("sort") ?? "uploadedAt") as SortParams["sort"],
    order: (c.req.query("order") ?? "desc") as SortParams["order"],
  };
}

function sortFolders(
  folders: FileListResponse["folders"],
  { sort, order }: SortParams,
): FileListResponse["folders"] {
  return folders.sort((a, b) => {
    let cmp = 0;
    if (sort === "uploadedAt") {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else {
      cmp = a.name.localeCompare(b.name);
    }
    return order === "desc" ? -cmp : cmp;
  });
}

function sortFiles(
  files: FileListResponse["files"],
  { sort, order }: SortParams,
): FileListResponse["files"] {
  return files.sort((a, b) => {
    let cmp = 0;
    if (sort === "name") {
      cmp = a.name.localeCompare(b.name);
    } else if (sort === "size") {
      cmp = a.size - b.size;
    } else {
      cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
    }
    return order === "desc" ? -cmp : cmp;
  });
}

export function getUploadLimits(c: Context<AppContext>) {
  const response: FileUploadLimitsResponse = {
    success: true,
    maxFileBytes: getUploadLimitBytes(c.env),
    maxBatchBytes: MAX_BATCH_UPLOAD_BYTES,
    multipartPartBytes: MULTIPART_UPLOAD_PART_BYTES,
  };

  return c.json(response);
}

export async function listFiles(c: Context<AppContext>) {
  try {
    const path = normalizeRelativePath(c.req.query("path"), { allowEmpty: true, label: "Path" });
    assertPathNotReserved(path);
    const { rootDirId } = await getFileContext(c);

    if (path && !(await folderExists(c.env, rootDirId, path))) {
      return jsonError(c, "Folder not found", 404);
    }

    const sortParams = getSortParams(c);
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

    const fileItems = allObjects
      .filter((object) => !isFolderMarkerKey(object.key, prefix))
      .map((object) => {
        const name = object.key.slice(prefix.length);
        return {
          name,
          path: joinRelativePath(path, name),
          size: object.size,
          createdAt: resolveFileCreatedAt(object),
          uploadedAt: object.uploaded.toISOString(),
          contentType: object.httpMetadata?.contentType ?? null,
          checksums: getFileChecksumMetadata(object.checksums),
        };
      });

    const response: FileListResponse = {
      success: true,
      path,
      folders: sortFolders(folders, sortParams),
      files: sortFiles(fileItems, sortParams),
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
}

export async function getDirectoryStats(c: Context<AppContext>) {
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
        if (isFolderMarkerKey(object.key, prefix)) {
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
}
