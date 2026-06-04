import type { UploadQueueItem } from "../../../../types";
import { REMAINING_STATUSES, getUploadQueueTotalProgress } from "../hooks/uploadQueueUtils";

const FAILED_FILE_ROW_STATUSES = new Set(["failed", "oversized", "duplicate"]);

type FolderUploadRoot = {
  folderPath: string;
  name: string;
};

export type UploadProgressDisplayRow =
  | {
      kind: "file";
      item: UploadQueueItem;
    }
  | UploadFolderProgressDisplayRow;

export type UploadFolderProgressDisplayRow = {
  kind: "folder";
  canCancel: boolean;
  canceled: number;
  completed: number;
  displayPath: string;
  failed: number;
  fileCount: number;
  folderPath: string;
  name: string;
  progress: number;
  remaining: number;
  size: number;
};

type FolderUploadGroup = FolderUploadRoot & {
  items: UploadQueueItem[];
};

type OrderedUploadEntry =
  | {
      kind: "file";
      item: UploadQueueItem;
    }
  | {
      kind: "folder";
      key: string;
    };

function normalizeSlashes(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

function getFolderUploadRoot(item: UploadQueueItem): FolderUploadRoot | null {
  const relativePath = normalizeSlashes(item.file.webkitRelativePath);
  const relativeSegments = relativePath.split("/");
  const rootName = relativeSegments[0];

  if (!rootName || relativeSegments.length < 2) {
    return null;
  }

  const targetSegments = normalizeSlashes(item.targetPath).split("/");
  if (targetSegments.length < relativeSegments.length) {
    return null;
  }

  const parentSegments = targetSegments.slice(0, targetSegments.length - relativeSegments.length);
  return {
    folderPath: [...parentSegments, rootName].join("/"),
    name: rootName,
  };
}

function countByStatus(
  items: UploadQueueItem[],
  predicate: (item: UploadQueueItem) => boolean,
): number {
  return items.filter(predicate).length;
}

function createFolderDisplayRow(group: FolderUploadGroup): UploadFolderProgressDisplayRow {
  const remaining = countByStatus(group.items, (item) => REMAINING_STATUSES.has(item.status));
  const failed = countByStatus(group.items, (item) => FAILED_FILE_ROW_STATUSES.has(item.status));
  const canceled = countByStatus(group.items, (item) => item.status === "canceled");
  const completed = countByStatus(group.items, (item) => item.status === "success");

  return {
    kind: "folder",
    canCancel: remaining > 0,
    canceled,
    completed,
    displayPath: group.folderPath,
    failed,
    fileCount: group.items.length,
    folderPath: group.folderPath,
    name: group.name,
    progress: getUploadQueueTotalProgress(group.items),
    remaining,
    size: group.items.reduce((sum, item) => sum + item.size, 0),
  };
}

function getFailedFileRows(items: UploadQueueItem[]): UploadProgressDisplayRow[] {
  return items
    .filter((item) => FAILED_FILE_ROW_STATUSES.has(item.status))
    .map((item) => ({ kind: "file", item }));
}

export function getUploadProgressDisplayRows(items: UploadQueueItem[]): UploadProgressDisplayRow[] {
  const orderedEntries: OrderedUploadEntry[] = [];
  const folderGroups = new Map<string, FolderUploadGroup>();

  for (const item of items.filter((uploadItem) => uploadItem.status !== "canceled")) {
    const folderRoot = getFolderUploadRoot(item);
    if (!folderRoot) {
      orderedEntries.push({ kind: "file", item });
      continue;
    }

    const existingGroup = folderGroups.get(folderRoot.folderPath);
    if (existingGroup) {
      existingGroup.items.push(item);
      continue;
    }

    folderGroups.set(folderRoot.folderPath, {
      ...folderRoot,
      items: [item],
    });
    orderedEntries.push({ kind: "folder", key: folderRoot.folderPath });
  }

  return orderedEntries.flatMap((entry): UploadProgressDisplayRow[] => {
    if (entry.kind === "file") {
      return [entry];
    }

    const group = folderGroups.get(entry.key);
    if (!group) {
      return [];
    }

    const folderRow = createFolderDisplayRow(group);
    return folderRow.failed > 0 ? [folderRow, ...getFailedFileRows(group.items)] : [folderRow];
  });
}
