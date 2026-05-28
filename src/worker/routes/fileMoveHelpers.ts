import type { FolderTreeNode } from "../../types";
import type { AppContext } from "../context";
import { folderExists } from "../utils/appHelpers";
import {
  FilePathValidationError,
  SYSTEM_PROFILE_FOLDER_NAME,
  getBaseName,
  getFileKey,
  getFolderPrefix,
  joinRelativePath,
} from "../utils/fileManager";
import {
  cleanupCopiedKeys,
  deleteKeysInBatches,
  getNoOverwriteHeaders,
  getObjectPutOptions,
  hasObjectBody,
  hasObjectSetChanged,
  listAllObjects,
} from "./filesShared";

export const MOVE_CONFLICT_MESSAGE = "目标文件夹已存在重名文件或文件夹";

type FolderTreeSourceObject = Pick<R2Object, "key">;

function addFolderPath(paths: Set<string>, folderPath: string) {
  if (!folderPath) {
    return;
  }

  const segments = folderPath.split("/");
  for (let index = 1; index <= segments.length; index += 1) {
    paths.add(segments.slice(0, index).join("/"));
  }
}

function getObjectFolderPath(relativeKey: string): string {
  const segments = relativeKey.split("/");
  return segments.slice(0, -1).join("/");
}

function isSystemRelativePath(relativeKey: string): boolean {
  return (
    relativeKey === SYSTEM_PROFILE_FOLDER_NAME ||
    relativeKey.startsWith(`${SYSTEM_PROFILE_FOLDER_NAME}/`)
  );
}

function buildFolderNode(path: string, childNamesByParent: Map<string, string[]>): FolderTreeNode {
  const childNames = childNamesByParent.get(path) ?? [];
  return {
    name: path ? getBaseName(path) : "",
    path,
    children: childNames.map((childName) => {
      const childPath = joinRelativePath(path, childName);
      return buildFolderNode(childPath, childNamesByParent);
    }),
  };
}

export function buildFolderTreeFromObjects(
  rootDirId: string,
  objects: FolderTreeSourceObject[],
): FolderTreeNode {
  const rootPrefix = `${rootDirId}/`;
  const folderPaths = new Set<string>([""]);

  for (const object of objects) {
    if (!object.key.startsWith(rootPrefix)) {
      continue;
    }

    const relativeKey = object.key.slice(rootPrefix.length);
    if (!relativeKey || isSystemRelativePath(relativeKey)) {
      continue;
    }

    addFolderPath(folderPaths, getObjectFolderPath(relativeKey));
  }

  const childNamesByParent = new Map<string, string[]>();
  for (const folderPath of folderPaths) {
    if (!folderPath) {
      continue;
    }

    const parentPath = getParentPath(folderPath);
    const childNames = childNamesByParent.get(parentPath) ?? [];
    childNames.push(getBaseName(folderPath));
    childNamesByParent.set(parentPath, childNames);
  }

  for (const childNames of childNamesByParent.values()) {
    childNames.sort((a, b) => a.localeCompare(b));
  }

  return buildFolderNode("", childNamesByParent);
}

export function getParentPath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

export function getMoveTargetPath(sourcePath: string, targetParentPath: string): string {
  return joinRelativePath(targetParentPath, getBaseName(sourcePath));
}

export function isFolderMoveDestinationInvalid(
  sourcePath: string,
  targetParentPath: string,
): boolean {
  return targetParentPath === sourcePath || targetParentPath.startsWith(`${sourcePath}/`);
}

export function assertFolderMoveDestinationAllowed(sourcePath: string, targetParentPath: string) {
  if (isFolderMoveDestinationInvalid(sourcePath, targetParentPath)) {
    throw new FilePathValidationError("Cannot move folder into itself or a child folder");
  }
}

export async function assertMoveTargetAvailable(
  env: AppContext["Bindings"],
  rootDirId: string,
  targetPath: string,
) {
  const fileCollision = await env.FILES_BUCKET.head(getFileKey(rootDirId, targetPath));
  if (fileCollision || (await folderExists(env, rootDirId, targetPath))) {
    throw new FilePathValidationError(MOVE_CONFLICT_MESSAGE, 409);
  }
}

export async function moveFileEntry(
  bucket: R2Bucket,
  rootDirId: string,
  path: string,
  targetParentPath: string,
) {
  const sourceKey = getFileKey(rootDirId, path);
  const targetKey = getFileKey(rootDirId, getMoveTargetPath(path, targetParentPath));
  const sourceHead = await bucket.head(sourceKey);

  if (!sourceHead) {
    throw new FilePathValidationError("File not found", 404);
  }

  const source = await bucket.get(sourceKey, {
    onlyIf: { etagMatches: sourceHead.etag },
  });
  if (!hasObjectBody(source)) {
    throw new FilePathValidationError("File changed during move", 409);
  }

  const putResult = await bucket.put(targetKey, source.body, getObjectPutOptions(source));
  if (!putResult) {
    throw new FilePathValidationError(MOVE_CONFLICT_MESSAGE, 409);
  }

  const latestSource = await bucket.head(sourceKey);
  if (!latestSource || latestSource.etag !== sourceHead.etag) {
    await bucket.delete(targetKey);
    throw new FilePathValidationError("File changed during move", 409);
  }

  await bucket.delete(sourceKey);
}

export async function moveFolderEntry(
  bucket: R2Bucket,
  rootDirId: string,
  path: string,
  targetParentPath: string,
) {
  const copiedKeys: string[] = [];
  const sourcePrefix = getFolderPrefix(rootDirId, path);
  const targetPrefix = getFolderPrefix(rootDirId, getMoveTargetPath(path, targetParentPath));
  const sourceObjects = await listAllObjects(bucket, sourcePrefix);

  if (sourceObjects.length === 0) {
    throw new FilePathValidationError("Folder not found", 404);
  }

  const sourceEtags = new Map(sourceObjects.map((object) => [object.key, object.etag]));

  try {
    for (const object of sourceObjects) {
      const source = await bucket.get(object.key, {
        onlyIf: { etagMatches: object.etag },
      });
      if (!hasObjectBody(source)) {
        throw new FilePathValidationError("Folder changed during move", 409);
      }

      const targetKey = `${targetPrefix}${object.key.slice(sourcePrefix.length)}`;
      const putResult = await bucket.put(targetKey, source.body, {
        ...getObjectPutOptions(source),
        onlyIf: getNoOverwriteHeaders(),
      });

      if (!putResult) {
        throw new FilePathValidationError(MOVE_CONFLICT_MESSAGE, 409);
      }
      copiedKeys.push(targetKey);
    }

    const currentSourceObjects = await listAllObjects(bucket, sourcePrefix);
    if (hasObjectSetChanged(currentSourceObjects, sourceEtags)) {
      throw new FilePathValidationError("Folder changed during move", 409);
    }
  } catch (error) {
    await cleanupCopiedKeys(bucket, copiedKeys);
    throw error;
  }

  await deleteKeysInBatches(
    bucket,
    sourceObjects.map((object) => object.key),
  );
}
