import type { SortKey, SortOrder } from "../../types";

export const FILES_ENDPOINT = "/api/files";
export const FILE_OBJECT_ENDPOINT = "/api/files/object";
export const FILE_FOLDERS_ENDPOINT = "/api/files/folders";
export const FILE_FOLDER_TREE_ENDPOINT = "/api/files/folder-tree";
export const FILE_MOVE_ENDPOINT = "/api/files/move";
export const FILE_BATCH_DELETE_ENDPOINT = "/api/files/batch-delete";
export const FILE_BATCH_MOVE_ENDPOINT = "/api/files/batch-move";
export const FILE_SHARE_LINKS_ENDPOINT = "/api/files/share-links";
export const FILE_STATS_ENDPOINT = "/api/files/stats";

export type FileListKey = [string, string, SortKey, SortOrder];

export function isFileListKey(key: unknown): key is FileListKey {
  return (
    Array.isArray(key) &&
    key.length === 4 &&
    key[0] === FILES_ENDPOINT &&
    typeof key[1] === "string" &&
    (key[2] === "name" || key[2] === "size" || key[2] === "uploadedAt") &&
    (key[3] === "asc" || key[3] === "desc")
  );
}

export function buildListUrl(path: string, sort: SortKey, order: SortOrder): string {
  const params = new URLSearchParams({ sort, order });
  if (path) {
    params.set("path", path);
  }
  return `${FILES_ENDPOINT}?${params.toString()}`;
}

export function buildStatsUrl(path: string): string {
  const params = new URLSearchParams();
  if (path) {
    params.set("path", path);
  }

  const query = params.toString();
  return query ? `${FILE_STATS_ENDPOINT}?${query}` : FILE_STATS_ENDPOINT;
}

export function buildDownloadUrl(path: string): string {
  const params = new URLSearchParams({ path });
  return `${FILE_OBJECT_ENDPOINT}?${params.toString()}`;
}

export function buildPreviewUrl(path: string): string {
  const params = new URLSearchParams({ path });
  return `/api/files/preview?${params.toString()}`;
}
