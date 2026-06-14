import useSWR, { useSWRConfig } from "swr";
import type {
  DirectoryStatsResponse,
  FileListResponse,
  FolderTreeResponse,
  SortKey,
  SortOrder,
} from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { getFolderUnlockHeadersForPath } from "../utils/folderUnlockTokens";
import {
  FILES_ENDPOINT,
  FILE_FOLDER_TREE_ENDPOINT,
  FILE_STATS_ENDPOINT,
  buildListUrl,
  buildStatsUrl,
  type FileListKey,
  isFileListKey,
} from "./filesApiUrls";

export function getDirectoryStats(path: string) {
  return apiRequest<DirectoryStatsResponse>(buildStatsUrl(path), {
    headers: getFolderUnlockHeadersForPath(path),
  });
}

export function useDirectoryStats(path: string, enabled: boolean) {
  const { data, error, isLoading } = useSWR<DirectoryStatsResponse, ApiError>(
    enabled ? [FILE_STATS_ENDPOINT, path] : null,
    (key) => {
      const [, currentPath] = key as [string, string];
      return apiRequest<DirectoryStatsResponse>(buildStatsUrl(currentPath), {
        headers: getFolderUnlockHeadersForPath(currentPath),
      });
    },
  );

  return {
    stats: data ?? null,
    error,
    isLoading,
  };
}

export function useFolderTree(enabled: boolean) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FolderTreeResponse, ApiError>(
    enabled ? FILE_FOLDER_TREE_ENDPOINT : null,
    (url: string) => apiRequest<FolderTreeResponse>(url),
  );

  return {
    tree: data?.root ?? null,
    error,
    isLoading,
    isRefreshing: isValidating,
    refresh: mutate,
  };
}

export function useFileList(path: string, sort: SortKey, order: SortOrder) {
  const { mutate } = useSWRConfig();
  const { data, error, isLoading, isValidating } = useSWR<FileListResponse, ApiError>(
    [FILES_ENDPOINT, path, sort, order] as FileListKey,
    (key) => {
      const [, currentPath, currentSort, currentOrder] = key as FileListKey;
      return apiRequest<FileListResponse>(buildListUrl(currentPath, currentSort, currentOrder), {
        headers: getFolderUnlockHeadersForPath(currentPath),
      });
    },
  );

  const refresh = async () => {
    await mutate((key) => isFileListKey(key));
  };

  return {
    data: {
      path,
      folders: data?.folders ?? [],
      files: data?.files ?? [],
    },
    error,
    isLoading,
    isRefreshing: isValidating,
    refresh,
  };
}
