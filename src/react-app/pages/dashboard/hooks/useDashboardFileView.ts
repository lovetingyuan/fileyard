import { useDeferredValue, useEffect } from "react";
import type { FileEntry, FolderEntry } from "../../../../types";
import { useFileList } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { ApiError } from "../../../utils/apiRequest";
import { findFuzzyMatchRanges } from "../utils/searchMatch";
import type { SearchMatchRange } from "../utils/searchMatch";
import { isMissingCurrentPathError } from "../utils/fileListError";
import { useDashboardPath } from "./useDashboardPath";
import { clearDismissedFolderPasswordTarget, openFolderPasswordModal } from "../actions";
import { getDashboardLockedPathAction } from "../utils/dashboardFolderNavigation";

export type SearchMatchedEntry<T> = T & {
  searchMatchRanges: SearchMatchRange[];
};

type DashboardFolderEntry = FolderEntry;

function getUniqueFolderName(folders: Array<FolderEntry>, baseName: string): string {
  const existingNames = new Set(folders.map((folder) => folder.name));
  if (!existingNames.has(baseName)) {
    return baseName;
  }

  let counter = 1;
  while (existingNames.has(`${baseName} (${counter})`)) {
    counter++;
  }
  return `${baseName} (${counter})`;
}

function getLockedProtectedPath(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 423) {
    return null;
  }

  const data = error.data;
  if (
    typeof data === "object" &&
    data !== null &&
    "code" in data &&
    "protectedPath" in data &&
    data.code === "folder_locked" &&
    typeof data.protectedPath === "string"
  ) {
    return data.protectedPath;
  }

  return null;
}

export function useDashboardFileView() {
  const { currentPath } = useDashboardPath();
  const {
    dashboardSortKey,
    dashboardSortOrder,
    dismissedFolderPasswordTarget,
    pendingFolderPasswordTarget,
    searchInputValue,
    searchKeyword,
  } = useAppStore();
  const deferredSearchQuery = useDeferredValue(searchKeyword);
  const fileList = useFileList(currentPath, dashboardSortKey, dashboardSortOrder);
  const isCurrentPathMissing = isMissingCurrentPathError(currentPath, fileList.error);
  const lockedProtectedPath = getLockedProtectedPath(fileList.error);

  useEffect(() => {
    if (!lockedProtectedPath) {
      return;
    }

    const action = getDashboardLockedPathAction({
      currentPath,
      dismissedTarget: dismissedFolderPasswordTarget,
      lockedProtectedPath,
      pendingTarget: pendingFolderPasswordTarget,
    });
    if (action.type === "ignore") {
      return;
    }

    openFolderPasswordModal(action.target);
  }, [currentPath, dismissedFolderPasswordTarget, lockedProtectedPath, pendingFolderPasswordTarget]);

  useEffect(() => {
    if (!dismissedFolderPasswordTarget || dismissedFolderPasswordTarget.path === currentPath) {
      return;
    }

    clearDismissedFolderPasswordTarget();
  }, [currentPath, dismissedFolderPasswordTarget]);

  const filteredFolders = fileList.data.folders.reduce<
    Array<SearchMatchedEntry<DashboardFolderEntry>>
  >((folders, folder) => {
    const searchMatchRanges = findFuzzyMatchRanges(folder.name, deferredSearchQuery);
    if (searchMatchRanges) {
      folders.push({ ...folder, searchMatchRanges });
    }
    return folders;
  }, []);
  const filteredFiles = fileList.data.files.reduce<Array<SearchMatchedEntry<FileEntry>>>(
    (files, file) => {
      const searchMatchRanges = findFuzzyMatchRanges(file.name, deferredSearchQuery);
      if (searchMatchRanges) {
        files.push({ ...file, searchMatchRanges });
      }
      return files;
    },
    [],
  );
  const totalBytes = filteredFiles.reduce((sum, file: FileEntry) => sum + file.size, 0);

  return {
    ...fileList,
    currentPath,
    dashboardSortKey,
    dashboardSortOrder,
    deferredSearchQuery,
    filteredFiles,
    filteredFolders,
    hasItems: filteredFiles.length > 0 || filteredFolders.length > 0,
    isCurrentPathMissing,
    isSearchPending: searchInputValue !== deferredSearchQuery,
    searchInputValue,
    totalBytes,
    getUniqueFolderName: (baseName: string) => getUniqueFolderName(fileList.data.folders, baseName),
  };
}
