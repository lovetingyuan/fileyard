import useSWR from "swr";
import type {
  DirectoryStatsResponse,
  FileListResponse,
  OptimisticFolderEntry,
  SortKey,
  SortOrder,
} from "../../types";
import { getStoreMethods, useAppStore } from "../store";
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

function useFileList(path: string, sort: SortKey, order: SortOrder) {
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

export function useFileListWithOptimistic(path: string, sort: SortKey, order: SortOrder) {
  const { optimisticFolders } = useAppStore();
  const { setOptimisticFolders } = getStoreMethods();
  const result = useFileList(path, sort, order);

  const addOptimisticFolder = (name: string) => {
    const folderPath = path ? `${path}/${name}` : name;
    setOptimisticFolders((prev: OptimisticFolderEntry[]) => [
      ...prev,
      { path: folderPath, name, createdAt: "", isOptimistic: true },
    ]);
    return folderPath;
  };

  const removeOptimisticFolder = (folderPath: string) => {
    setOptimisticFolders((prev) => prev.filter((f) => f.path !== folderPath));
  };

  const clearOptimisticFolders = () => {
    setOptimisticFolders([]);
  };

  const folders = [
    ...optimisticFolders,
    ...result.data.folders.filter((f) => !optimisticFolders.some((of) => of.path === f.path)),
  ];

  return {
    ...result,
    data: {
      ...result.data,
      folders,
    },
    addOptimisticFolder,
    removeOptimisticFolder,
    clearOptimisticFolders,
  };
}
