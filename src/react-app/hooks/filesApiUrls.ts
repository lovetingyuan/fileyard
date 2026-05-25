import type { SortKey, SortOrder } from "../../types";

export const FILES_ENDPOINT = "/api/files";
export const FILE_OBJECT_ENDPOINT = "/api/files/object";
export const FILE_FOLDERS_ENDPOINT = "/api/files/folders";
export const FILE_SHARE_LINKS_ENDPOINT = "/api/files/share-links";
export const FILE_STATS_ENDPOINT = "/api/files/stats";

export type FileListKey = [string, string, SortKey, SortOrder];

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
