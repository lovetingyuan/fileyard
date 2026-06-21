import type { AppContext } from "../context";
import { folderExists } from "../utils/appHelpers";
import {
  FilePathValidationError,
  getBaseName,
  getFileKey,
  getFolderMarkerKeys,
  getFolderPrefix,
  isReservedSystemPath,
} from "../utils/fileManager";

export const MAX_BATCH_UPLOAD_BYTES = 1024 * 1024 * 1024;

export function getParentPath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

export function getNoOverwriteHeaders(): Headers {
  return new Headers({ "If-None-Match": "*" });
}

export function hasObjectBody(object: R2Object | R2ObjectBody | null): object is R2ObjectBody {
  return Boolean(object && "body" in object);
}

export function getObjectPutOptions(
  object: R2Object,
  customMetadata = object.customMetadata,
): R2PutOptions {
  return {
    customMetadata,
    httpMetadata: object.httpMetadata,
    onlyIf: getNoOverwriteHeaders(),
    ...(object.storageClass ? { storageClass: object.storageClass } : {}),
  };
}

export async function listAllObjects(bucket: R2Bucket, prefix: string): Promise<R2Object[]> {
  const objects: R2Object[] = [];
  let cursor: string | undefined;

  do {
    const listing = await bucket.list({
      cursor,
      include: ["httpMetadata", "customMetadata"],
      prefix,
    });
    objects.push(...listing.objects);
    cursor = listing.truncated ? listing.cursor : undefined;
  } while (cursor);

  return objects;
}

export function assertNameChanged(
  currentPath: string,
  newName: string,
  type: "file" | "folder",
): void {
  if (getBaseName(currentPath) === newName) {
    throw new FilePathValidationError(`New ${type} name must be different`);
  }
}

export async function assertRenameTargetAvailable(
  env: AppContext["Bindings"],
  rootDirId: string,
  targetPath: string,
): Promise<void> {
  const fileCollision = await env.FILES_BUCKET.head(getFileKey(rootDirId, targetPath));
  if (fileCollision) {
    throw new FilePathValidationError("A file with this name already exists", 409);
  }

  if (await folderExists(env, rootDirId, targetPath)) {
    throw new FilePathValidationError("A folder with this name already exists", 409);
  }
}

export function hasObjectSetChanged(
  currentObjects: R2Object[],
  expectedEtags: Map<string, string>,
): boolean {
  if (currentObjects.length !== expectedEtags.size) {
    return true;
  }

  return currentObjects.some((object) => expectedEtags.get(object.key) !== object.etag);
}

export async function deleteKeysInBatches(bucket: R2Bucket, keys: string[]): Promise<void> {
  for (let i = 0; i < keys.length; i += 1000) {
    await bucket.delete(keys.slice(i, i + 1000));
  }
}

export async function cleanupCopiedKeys(bucket: R2Bucket, copiedKeys: string[]): Promise<void> {
  if (copiedKeys.length === 0) {
    return;
  }

  try {
    await deleteKeysInBatches(bucket, copiedKeys);
  } catch (error) {
    console.error("Failed to clean up copied rename objects", error);
  }
}

export async function getFolderCreatedAt(
  bucket: R2Bucket,
  rootDirId: string,
  folderPath: string,
): Promise<string> {
  let marker: R2Object | null = null;
  for (const markerKey of getFolderMarkerKeys(rootDirId, folderPath)) {
    marker = await bucket.head(markerKey);
    if (marker) {
      break;
    }
  }

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

export function resolveFileCreatedAt(
  object: Pick<R2Object, "uploaded" | "customMetadata">,
): string {
  return object.customMetadata?.createdAt ?? object.uploaded.toISOString();
}

export function assertPathNotReserved(path: string): void {
  if (isReservedSystemPath(path)) {
    throw new FilePathValidationError("Path uses a reserved system directory", 403);
  }
}
