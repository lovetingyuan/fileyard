import type { Context } from "hono";
import type { BatchDeleteRequest, BatchMoveRequest } from "../../types";
import type { AppContext } from "../context";
import { folderExists, getFileContext } from "../utils/appHelpers";
import {
  FilePathValidationError,
  getFileKey,
  getFolderPrefix,
  normalizeRelativePath,
} from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import { assertPathNotReserved, deleteKeysInBatches } from "./filesShared";
import { getValidatedJson } from "../validation";
import {
  assertMoveTargetAvailable,
  getMoveTargetPath,
  moveFileEntry,
  moveFolderEntry,
} from "./fileMoveHelpers";
import {
  createBatchFailureResult,
  createBatchFileMutationResponse,
  createBatchSuccessResult,
  getBatchMoveValidationMessage,
  getBatchMutationStatus,
  normalizeBatchTargets,
} from "./fileBatchOperationHelpers";

function getOperationErrorMessage(error: unknown, fallbackMessage: string): string {
  if (error instanceof FilePathValidationError || error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}

export async function batchDeleteEntries(c: Context<AppContext>) {
  try {
    const body = getValidatedJson<BatchDeleteRequest>(c);
    const targets = normalizeBatchTargets(body.targets);
    for (const target of targets) {
      assertPathNotReserved(target.path);
    }

    const { rootDirId } = await getFileContext(c);
    const results = [];

    for (const target of targets) {
      try {
        if (target.type === "file") {
          const fileKey = getFileKey(rootDirId, target.path);
          const object = await c.env.FILES_BUCKET.head(fileKey);
          if (!object) {
            results.push(createBatchFailureResult(target, "File not found"));
            continue;
          }

          await c.env.FILES_BUCKET.delete(fileKey);
          results.push(createBatchSuccessResult(target, "File deleted successfully"));
          continue;
        }

        if (!(await folderExists(c.env, rootDirId, target.path))) {
          results.push(createBatchFailureResult(target, "Folder not found"));
          continue;
        }

        const prefix = getFolderPrefix(rootDirId, target.path);
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
        results.push(createBatchSuccessResult(target, "Folder deleted successfully"));
      } catch (error) {
        console.error("Failed to batch delete entry", { error, target });
        results.push(
          createBatchFailureResult(
            target,
            getOperationErrorMessage(error, "Failed to delete entry"),
          ),
        );
      }
    }

    const response = createBatchFileMutationResponse("delete", results);
    return c.json(response, getBatchMutationStatus(response));
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to batch delete entries", error);
    return jsonError(c, "Failed to batch delete entries", 500);
  }
}

export async function batchMoveEntries(c: Context<AppContext>) {
  try {
    const body = getValidatedJson<BatchMoveRequest>(c);
    const targets = normalizeBatchTargets(body.targets);
    const targetParentPath = normalizeRelativePath(body.targetParentPath, {
      allowEmpty: true,
      label: "Target parent path",
    });
    assertPathNotReserved(targetParentPath);
    for (const target of targets) {
      assertPathNotReserved(target.path);
    }

    const { rootDirId } = await getFileContext(c);
    if (!(await folderExists(c.env, rootDirId, targetParentPath))) {
      return jsonError(c, "Target folder not found", 404);
    }

    const results = [];
    for (const target of targets) {
      try {
        const validationMessage = getBatchMoveValidationMessage(target, targetParentPath);
        if (validationMessage) {
          results.push(createBatchFailureResult(target, validationMessage));
          continue;
        }

        const targetPath = getMoveTargetPath(target.path, targetParentPath);
        assertPathNotReserved(targetPath);

        if (target.type === "file") {
          const sourceHead = await c.env.FILES_BUCKET.head(getFileKey(rootDirId, target.path));
          if (!sourceHead) {
            results.push(createBatchFailureResult(target, "File not found"));
            continue;
          }

          await assertMoveTargetAvailable(c.env, rootDirId, targetPath);
          await moveFileEntry(c.env.FILES_BUCKET, rootDirId, target.path, targetParentPath);
          results.push(createBatchSuccessResult(target, "File moved successfully"));
          continue;
        }

        if (!(await folderExists(c.env, rootDirId, target.path))) {
          results.push(createBatchFailureResult(target, "Folder not found"));
          continue;
        }

        await assertMoveTargetAvailable(c.env, rootDirId, targetPath);
        await moveFolderEntry(c.env.FILES_BUCKET, rootDirId, target.path, targetParentPath);
        results.push(createBatchSuccessResult(target, "Folder moved successfully"));
      } catch (error) {
        console.error("Failed to batch move entry", { error, target });
        results.push(
          createBatchFailureResult(target, getOperationErrorMessage(error, "Failed to move entry")),
        );
      }
    }

    const response = createBatchFileMutationResponse("move", results);
    return c.json(response, getBatchMutationStatus(response));
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to batch move entries", error);
    return jsonError(c, "Failed to batch move entries", 500);
  }
}
