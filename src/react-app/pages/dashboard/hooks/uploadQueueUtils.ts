import type { UploadQueueItem, UploadQueueStatus } from "../../../../types";
import { ApiError } from "../../../utils/apiRequest";
import { FileUploadError, UploadCanceledError } from "../../../utils/fileUpload";

export const REMAINING_STATUSES = new Set<UploadQueueStatus>(["queued", "preparing", "uploading"]);
const FAILED_STATUSES = new Set<UploadQueueStatus>(["failed", "oversized", "duplicate"]);

type UploadQueueStats = {
  active: number;
  failed: number;
  hasVisibleStatus: boolean;
  remaining: number;
  total: number;
};

export type UploadQueuePanelState = UploadQueueStats & {
  canceled: number;
  canCancelAll: boolean;
  completed: number;
  hasTerminalIssues: boolean;
  isComplete: boolean;
  shouldShowPanel: boolean;
  totalProgress: number;
};

type CreateFolder = (parentPath: string, name: string) => Promise<void>;
type EnsureParentFolders = (parentPath: string, isCanceled: () => boolean) => Promise<void>;

function isFolderAlreadyExistsError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.message.includes("folder");
}

export function isDuplicateUploadError(error: unknown): boolean {
  if (error instanceof FileUploadError) {
    return error.status === 409;
  }
  return error instanceof ApiError && error.status === 409 && !error.message.includes("folder");
}

export function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "上传失败";
}

export function createFolderEnsureer(createFolderRequest: CreateFolder): EnsureParentFolders {
  const folderCreationPromises = new Map<string, Promise<void>>();

  return async function ensureParentFolders(parentPath, isCanceled) {
    if (!parentPath) {
      return;
    }

    const segments = parentPath.split("/");
    let path = "";
    for (const name of segments) {
      if (isCanceled()) {
        throw new UploadCanceledError();
      }

      const folderPath = path ? `${path}/${name}` : name;
      let creationPromise = folderCreationPromises.get(folderPath);
      if (!creationPromise) {
        creationPromise = createFolderRequest(path, name).catch((error: unknown) => {
          if (!isFolderAlreadyExistsError(error)) {
            folderCreationPromises.delete(folderPath);
            throw error;
          }
        });
        folderCreationPromises.set(folderPath, creationPromise);
      }

      await creationPromise;
      path = folderPath;
    }
  };
}

export function updateUploadQueueItem(
  items: UploadQueueItem[],
  id: string,
  patch: Partial<UploadQueueItem>,
): UploadQueueItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export function appendUploadQueueItems(
  items: UploadQueueItem[],
  nextItems: UploadQueueItem[],
): UploadQueueItem[] {
  return [...items, ...nextItems];
}

export function resetFailedUploadItem(item: UploadQueueItem): UploadQueueItem {
  if (item.status !== "failed") {
    return item;
  }
  return {
    ...item,
    errorMessage: null,
    progress: 0,
    status: "queued",
  };
}

export function countUploadQueueStats(items: UploadQueueItem[]): UploadQueueStats {
  const remaining = items.filter((item) => REMAINING_STATUSES.has(item.status)).length;
  const failed = items.filter((item) => FAILED_STATUSES.has(item.status)).length;

  return {
    total: items.length,
    remaining,
    failed,
    active: remaining,
    hasVisibleStatus: remaining > 0 || failed > 0,
  };
}

function isUploadTargetInFolder(targetPath: string, folderPath: string): boolean {
  return targetPath === folderPath || targetPath.startsWith(`${folderPath}/`);
}

export function getActiveUploadItemsInFolder(
  items: UploadQueueItem[],
  folderPath: string,
): UploadQueueItem[] {
  return items.filter(
    (item) => REMAINING_STATUSES.has(item.status) && isUploadTargetInFolder(item.targetPath, folderPath),
  );
}

export function getUploadQueueSummary(items: UploadQueueItem[]): string | null {
  const stats = countUploadQueueStats(items);
  if (stats.active > 0) {
    return "上传中，点击查看详情";
  }
  if (stats.failed > 0) {
    return `${stats.failed} 文件上传失败`;
  }
  return null;
}

export function getUploadQueueItemProgress(item: UploadQueueItem): number {
  if (item.status === "success") {
    return 100;
  }
  if (item.status === "queued" || item.status === "preparing") {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(item.progress)));
}

export function getUploadQueueTotalProgress(items: UploadQueueItem[]): number {
  if (items.length === 0) {
    return 0;
  }

  const totalBytes = items.reduce((sum, item) => sum + item.size, 0);
  if (totalBytes <= 0) {
    const totalProgress = items.reduce((sum, item) => sum + getUploadQueueItemProgress(item), 0);
    return Math.round(totalProgress / items.length);
  }

  const uploadedBytes = items.reduce(
    (sum, item) => sum + item.size * (getUploadQueueItemProgress(item) / 100),
    0,
  );
  return Math.max(0, Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)));
}

export function getUploadQueuePanelState(items: UploadQueueItem[]): UploadQueuePanelState {
  const stats = countUploadQueueStats(items);
  const canceled = items.filter((item) => item.status === "canceled").length;
  const completed = items.filter((item) => item.status === "success").length;
  const hasTerminalIssues = stats.failed > 0 || canceled > 0;
  const isComplete = items.length > 0 && stats.remaining === 0;

  return {
    ...stats,
    canceled,
    completed,
    totalProgress: getUploadQueueTotalProgress(items),
    canCancelAll: stats.remaining > 0,
    hasTerminalIssues,
    isComplete,
    shouldShowPanel: stats.hasVisibleStatus,
  };
}
