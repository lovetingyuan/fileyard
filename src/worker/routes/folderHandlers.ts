import type { Context } from "hono";
import type { CreateFolderRequest, FileMutationResponse, RenameRequest } from "../../types";
import type { AppContext } from "../context";
import { folderExists, getFileContext } from "../utils/appHelpers";
import {
  FilePathValidationError,
  getFileKey,
  getFolderMarkerKey,
  getFolderPrefix,
  joinRelativePath,
  normalizeName,
  normalizeRelativePath,
} from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import {
  assertNameChanged,
  assertPathNotReserved,
  assertRenameTargetAvailable,
  cleanupCopiedKeys,
  deleteKeysInBatches,
  getObjectPutOptions,
  getParentPath,
  hasObjectBody,
  hasObjectSetChanged,
  listAllObjects,
} from "./filesShared";
import { getValidatedJson, getValidatedQuery, type PathQuery } from "../validation";

export async function createFolder(c: Context<AppContext>) {
  try {
    const body = getValidatedJson<CreateFolderRequest>(c);
    const parentPath = normalizeRelativePath(body.parentPath, {
      allowEmpty: true,
      label: "Parent path",
    });
    assertPathNotReserved(parentPath);
    const name = normalizeName(body.name, "Folder name");
    const ensureOnly = body.ensure === true;
    const folderPath = joinRelativePath(parentPath, name);
    assertPathNotReserved(folderPath);
    const { rootDirId } = await getFileContext(c);

    if (!(await folderExists(c.env, rootDirId, parentPath))) {
      return jsonError(c, "Parent folder not found", 404);
    }

    const fileCollision = await c.env.FILES_BUCKET.head(getFileKey(rootDirId, folderPath));
    if (fileCollision) {
      return jsonError(c, "A file with this name already exists", 409);
    }

    if (await folderExists(c.env, rootDirId, folderPath)) {
      if (ensureOnly) {
        const response: FileMutationResponse = {
          success: true,
          message: "Folder already exists",
        };
        return c.json(response);
      }
      return jsonError(c, "A folder with this name already exists", 409);
    }

    const markerKey = getFolderMarkerKey(rootDirId, folderPath);
    const createdAt = new Date().toISOString();
    const putResult = await c.env.FILES_BUCKET.put(markerKey, new Uint8Array(), {
      customMetadata: { kind: "folder-marker", createdAt },
      onlyIf: new Headers({ "If-None-Match": "*" }),
    });

    if (!putResult) {
      if (ensureOnly && (await folderExists(c.env, rootDirId, folderPath))) {
        const response: FileMutationResponse = {
          success: true,
          message: "Folder already exists",
        };
        return c.json(response);
      }
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
}

export async function deleteFolder(c: Context<AppContext>) {
  try {
    const query = getValidatedQuery<PathQuery>(c);
    const path = normalizeRelativePath(query.path, { allowEmpty: false, label: "Path" });
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

    await deleteKeysInBatches(c.env.FILES_BUCKET, keysToDelete);

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
}

export async function renameFolder(c: Context<AppContext>) {
  const copiedKeys: string[] = [];

  try {
    const body = getValidatedJson<RenameRequest>(c);
    const path = normalizeRelativePath(body.path, { allowEmpty: false, label: "Path" });
    assertPathNotReserved(path);
    const name = normalizeName(body.name, "Folder name");
    assertNameChanged(path, name, "folder");
    const parentPath = getParentPath(path);
    const targetPath = joinRelativePath(parentPath, name);
    assertPathNotReserved(targetPath);
    const { rootDirId } = await getFileContext(c);

    if (!(await folderExists(c.env, rootDirId, path))) {
      return jsonError(c, "Folder not found", 404);
    }

    await assertRenameTargetAvailable(c.env, rootDirId, targetPath);

    const sourcePrefix = getFolderPrefix(rootDirId, path);
    const targetPrefix = getFolderPrefix(rootDirId, targetPath);
    const sourceObjects = await listAllObjects(c.env.FILES_BUCKET, sourcePrefix);

    if (sourceObjects.length === 0) {
      return jsonError(c, "Folder not found", 404);
    }

    const sourceEtags = new Map(sourceObjects.map((object) => [object.key, object.etag]));

    try {
      for (const object of sourceObjects) {
        const source = await c.env.FILES_BUCKET.get(object.key, {
          onlyIf: { etagMatches: object.etag },
        });
        if (!hasObjectBody(source)) {
          throw new FilePathValidationError("Folder changed during rename", 409);
        }

        const targetKey = `${targetPrefix}${object.key.slice(sourcePrefix.length)}`;
        const putResult = await c.env.FILES_BUCKET.put(
          targetKey,
          source.body,
          getObjectPutOptions(source),
        );

        if (!putResult) {
          throw new FilePathValidationError("A file or folder with this name already exists", 409);
        }
        copiedKeys.push(targetKey);
      }

      const currentSourceObjects = await listAllObjects(c.env.FILES_BUCKET, sourcePrefix);
      if (hasObjectSetChanged(currentSourceObjects, sourceEtags)) {
        throw new FilePathValidationError("Folder changed during rename", 409);
      }
    } catch (error) {
      await cleanupCopiedKeys(c.env.FILES_BUCKET, copiedKeys);
      throw error;
    }

    await deleteKeysInBatches(
      c.env.FILES_BUCKET,
      sourceObjects.map((object) => object.key),
    );

    const response: FileMutationResponse = {
      success: true,
      message: "Folder renamed successfully",
    };
    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to rename folder", error);
    return jsonError(c, "Failed to rename folder", 500);
  }
}
