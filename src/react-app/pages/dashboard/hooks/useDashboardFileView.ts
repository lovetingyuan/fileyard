import { useDeferredValue } from "react";
import type { FileEntry, FolderEntry } from "../../../../types";
import { useFileListWithOptimistic } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { useDashboardPath } from "./useDashboardPath";

function fuzzyMatch(name: string, query: string) {
  if (!query) {
    return true;
  }

  const lowerName = name.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let queryIndex = 0;
  for (let index = 0; index < lowerName.length && queryIndex < lowerQuery.length; index++) {
    if (lowerName[index] === lowerQuery[queryIndex]) {
      queryIndex++;
    }
  }
  return queryIndex === lowerQuery.length;
}

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

export function useDashboardFileView() {
  const { currentPath } = useDashboardPath();
  const { dashboardSortKey, dashboardSortOrder, searchInputValue, searchKeyword } = useAppStore();
  const deferredSearchQuery = useDeferredValue(searchKeyword);
  const fileList = useFileListWithOptimistic(currentPath, dashboardSortKey, dashboardSortOrder);
  const filteredFolders = fileList.data.folders.filter((folder) =>
    fuzzyMatch(folder.name, deferredSearchQuery),
  );
  const filteredFiles = fileList.data.files.filter((file) =>
    fuzzyMatch(file.name, deferredSearchQuery),
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
    isSearchPending: searchInputValue !== deferredSearchQuery,
    searchInputValue,
    totalBytes,
    getUniqueFolderName: (baseName: string) => getUniqueFolderName(fileList.data.folders, baseName),
  };
}
