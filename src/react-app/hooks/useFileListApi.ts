import useSWR from "swr";
import type {
  DirectoryStatsResponse,
  FileListResponse,
  SortKey,
  SortOrder,
} from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import {
  FILES_ENDPOINT,
  FILE_STATS_ENDPOINT,
  buildListUrl,
  buildStatsUrl,
  type FileListKey,
} from "./filesApiUrls";

export function getDirectoryStats(path: string) {
  return apiRequest<DirectoryStatsResponse>(buildStatsUrl(path));
}

export function useDirectoryStats(path: string, enabled: boolean) {
  const { data, error, isLoading } = useSWR<DirectoryStatsResponse, ApiError>(
    enabled ? [FILE_STATS_ENDPOINT, path] : null,
    (key) => {
      const [, currentPath] = key as [string, string];
      return apiRequest<DirectoryStatsResponse>(buildStatsUrl(currentPath));
    },
  );

  return {
    stats: data ?? null,
    error,
    isLoading,
  };
}

export function useFileList(path: string, sort: SortKey, order: SortOrder) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FileListResponse, ApiError>(
    [FILES_ENDPOINT, path, sort, order] as FileListKey,
    (key) => {
      const [, currentPath, currentSort, currentOrder] = key as FileListKey;
      return apiRequest<FileListResponse>(buildListUrl(currentPath, currentSort, currentOrder));
    },
  );

  const refresh = async () => {
    await mutate();
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
