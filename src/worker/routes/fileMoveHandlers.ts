import type { Context } from "hono";
import type { FileMutationResponse, FolderTreeResponse, MoveRequest } from "../../types";
import type { AppContext } from "../context";
import { folderExists, getFileContext } from "../utils/appHelpers";
import { FilePathValidationError, getFileKey, normalizeRelativePath } from "../utils/fileManager";
import { handlePathValidationError, jsonError } from "../utils/response";
import { assertPathNotReserved, listAllObjects } from "./filesShared";
import { getValidatedJson } from "../validation";
import {
  MOVE_CONFLICT_MESSAGE,
  assertFolderMoveDestinationAllowed,
  assertMoveTargetAvailable,
  buildFolderTreeFromObjects,
  getMoveTargetPath,
  getParentPath,
  moveFileEntry,
  moveFolderEntry,
} from "./fileMoveHelpers";

export { MOVE_CONFLICT_MESSAGE };

function normalizeMoveType(type: MoveRequest["type"] | undefined): MoveRequest["type"] {
  if (type !== "file" && type !== "folder") {
    throw new FilePathValidationError("Type must be file or folder");
  }

  return type;
}

export async function listFolderTree(c: Context<AppContext>) {
  try {
    const { rootDirId } = await getFileContext(c);
    const objects = await listAllObjects(c.env.FILES_BUCKET, `${rootDirId}/`);
    const response: FolderTreeResponse = {
      success: true,
      root: buildFolderTreeFromObjects(rootDirId, objects),
    };

    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to list folder tree", error);
    return jsonError(c, "Failed to list folder tree", 500);
  }
}

export async function moveEntry(c: Context<AppContext>) {
  try {
    const body = getValidatedJson<MoveRequest>(c);
    const type = normalizeMoveType(body.type);
    const path = normalizeRelativePath(body.path, { allowEmpty: false, label: "Path" });
    const targetParentPath = normalizeRelativePath(body.targetParentPath, {
      allowEmpty: true,
      label: "Target parent path",
    });
    assertPathNotReserved(path);
    assertPathNotReserved(targetParentPath);

    const { rootDirId } = await getFileContext(c);
    if (!(await folderExists(c.env, rootDirId, targetParentPath))) {
      return jsonError(c, "Target folder not found", 404);
    }

    if (targetParentPath === getParentPath(path)) {
      return jsonError(c, "Target folder must be different", 400);
    }

    const targetPath = getMoveTargetPath(path, targetParentPath);
    assertPathNotReserved(targetPath);

    if (type === "file") {
      const sourceHead = await c.env.FILES_BUCKET.head(getFileKey(rootDirId, path));
      if (!sourceHead) {
        return jsonError(c, "File not found", 404);
      }
      await assertMoveTargetAvailable(c.env, rootDirId, targetPath);
      await moveFileEntry(c.env.FILES_BUCKET, rootDirId, path, targetParentPath);
    } else {
      if (!(await folderExists(c.env, rootDirId, path))) {
        return jsonError(c, "Folder not found", 404);
      }
      assertFolderMoveDestinationAllowed(path, targetParentPath);
      await assertMoveTargetAvailable(c.env, rootDirId, targetPath);
      await moveFolderEntry(c.env.FILES_BUCKET, rootDirId, path, targetParentPath);
    }

    const response: FileMutationResponse = { success: true, message: "Entry moved successfully" };
    return c.json(response);
  } catch (error) {
    const validationError = handlePathValidationError(c, error);
    if (validationError) {
      return validationError;
    }
    console.error("Failed to move entry", error);
    return jsonError(c, "Failed to move entry", 500);
  }
}
