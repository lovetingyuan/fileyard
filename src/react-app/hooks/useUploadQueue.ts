import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CreateFolderRequest,
  FileUploadLimitsResponse,
  UploadQueueItem,
  UploadQueueStatus,
} from "../../types";
import { ApiError, apiRequest } from "../utils/apiRequest";
import { FileUploadError, UploadCanceledError, uploadFileWithProgress } from "../utils/fileUpload";
import { FILE_UPLOAD_BATCH_LIMIT_BYTES, createUploadQueueItems } from "../utils/uploadSelection";

const FILE_UPLOAD_LIMITS_ENDPOINT = "/api/files/upload-limits";
const FILE_FOLDERS_ENDPOINT = "/api/files/folders";
const MAX_CONCURRENT_UPLOADS = 3;
const SUCCESS_PANEL_DISMISS_DELAY_MS = 1600;

type UploadQueueStats = {
  total: number;
  remaining: number;
  failed: number;
  active: number;
  hasVisibleStatus: boolean;
};

export type UploadQueuePanelState = UploadQueueStats & {
  canceled: number;
  completed: number;
  totalProgress: number;
  canCancelAll: boolean;
  hasTerminalIssues: boolean;
  isComplete: boolean;
  shouldShowPanel: boolean;
};

type UseUploadQueueArgs = {
  currentPath: string;
  onUploadsComplete: () => Promise<void> | void;
};

type UploadTask = ReturnType<typeof uploadFileWithProgress>;
type CreateFolder = (parentPath: string, name: string) => Promise<void>;
type EnsureParentFolders = (parentPath: string, isCanceled: () => boolean) => Promise<void>;

const REMAINING_STATUSES = new Set<UploadQueueStatus>(["queued", "preparing", "uploading"]);
const FAILED_STATUSES = new Set<UploadQueueStatus>(["failed", "oversized", "duplicate"]);

function isFolderAlreadyExistsError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.message.includes("folder");
}

function isDuplicateUploadError(error: unknown): boolean {
  if (error instanceof FileUploadError) {
    return error.status === 409;
  }
  return error instanceof ApiError && error.status === 409 && !error.message.includes("folder");
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "上传失败";
}

async function fetchUploadLimits(): Promise<FileUploadLimitsResponse> {
  return apiRequest<FileUploadLimitsResponse>(FILE_UPLOAD_LIMITS_ENDPOINT);
}

async function createFolder(parentPath: string, name: string): Promise<void> {
  await apiRequest(FILE_FOLDERS_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ parentPath, name, ensure: true } satisfies CreateFolderRequest),
  });
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

export function resetFailedUploadItem(item: UploadQueueItem): UploadQueueItem {
  if (item.status !== "failed") {
    return item;
  }
  return {
    ...item,
    progress: 0,
    status: "queued",
    errorMessage: null,
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

export function useUploadQueue({ currentPath, onUploadsComplete }: UseUploadQueueArgs) {
  const [items, setItemsState] = useState<UploadQueueItem[]>([]);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const itemsRef = useRef<UploadQueueItem[]>([]);
  const activeIdsRef = useRef(new Set<string>());
  const activeItemPromisesRef = useRef(new Map<string, Promise<void>>());
  const uploadTasksRef = useRef(new Map<string, UploadTask>());
  const ensureParentFoldersRef = useRef(createFolderEnsureer(createFolder));
  const uploadedSinceIdleRef = useRef(false);
  const successDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSuccessDismissTimer = useCallback(() => {
    if (!successDismissTimerRef.current) {
      return;
    }
    clearTimeout(successDismissTimerRef.current);
    successDismissTimerRef.current = null;
  }, []);

  const setItems = useCallback((updater: (items: UploadQueueItem[]) => UploadQueueItem[]) => {
    const nextItems = updater(itemsRef.current);
    itemsRef.current = nextItems;
    setItemsState(nextItems);
  }, []);

  const isItemCanceled = useCallback((id: string) => {
    return itemsRef.current.find((item) => item.id === id)?.status === "canceled";
  }, []);

  const scheduleSuccessfulPanelDismiss = useCallback(() => {
    const panelState = getUploadQueuePanelState(itemsRef.current);
    if (!panelState.isComplete || panelState.hasTerminalIssues) {
      return;
    }

    clearSuccessDismissTimer();
    successDismissTimerRef.current = setTimeout(() => {
      const latestPanelState = getUploadQueuePanelState(itemsRef.current);
      if (!latestPanelState.isComplete || latestPanelState.hasTerminalIssues) {
        return;
      }
      itemsRef.current = [];
      setItemsState([]);
      setIsPanelMinimized(false);
      successDismissTimerRef.current = null;
    }, SUCCESS_PANEL_DISMISS_DELAY_MS);
  }, [clearSuccessDismissTimer]);

  const finishIdleBatch = useCallback(() => {
    if (activeIdsRef.current.size > 0) {
      return;
    }
    if (itemsRef.current.some((item) => item.status === "queued")) {
      return;
    }
    if (!uploadedSinceIdleRef.current) {
      return;
    }
    uploadedSinceIdleRef.current = false;
    void onUploadsComplete();
    scheduleSuccessfulPanelDismiss();
  }, [onUploadsComplete, scheduleSuccessfulPanelDismiss]);

  const processQueueRef = useRef<() => void>(() => undefined);

  const cancelUploadIds = useCallback(
    (ids: Set<string>) => {
      if (ids.size === 0) {
        return;
      }

      clearSuccessDismissTimer();
      for (const id of ids) {
        uploadTasksRef.current.get(id)?.cancel();
      }
      const nextItems = itemsRef.current.map((item) =>
        ids.has(item.id) && REMAINING_STATUSES.has(item.status)
          ? { ...item, status: "canceled" as const, errorMessage: null }
          : item,
      );
      itemsRef.current = nextItems;
      setItemsState(nextItems);
    },
    [clearSuccessDismissTimer],
  );

  const cancelUpload = useCallback(
    (id: string) => {
      cancelUploadIds(new Set([id]));
      processQueueRef.current();
      finishIdleBatch();
    },
    [cancelUploadIds, finishIdleBatch],
  );

  const startItem = useCallback(
    async (item: UploadQueueItem) => {
      activeIdsRef.current.add(item.id);
      setItems((currentItems) =>
        updateUploadQueueItem(currentItems, item.id, {
          status: "preparing",
          errorMessage: null,
        }),
      );

      try {
        await ensureParentFoldersRef.current(item.parentPath, () => isItemCanceled(item.id));
        if (isItemCanceled(item.id)) {
          return;
        }

        setItems((currentItems) =>
          updateUploadQueueItem(currentItems, item.id, {
            status: "uploading",
            progress: Math.max(item.progress, 1),
          }),
        );

        const task = uploadFileWithProgress({
          file: item.file,
          parentPath: item.parentPath,
          onProgress: (progress) => {
            setItems((currentItems) => updateUploadQueueItem(currentItems, item.id, { progress }));
          },
        });
        uploadTasksRef.current.set(item.id, task);
        await task.promise;
        uploadedSinceIdleRef.current = true;
        setItems((currentItems) =>
          updateUploadQueueItem(currentItems, item.id, {
            status: "success",
            progress: 100,
            errorMessage: null,
          }),
        );
      } catch (error) {
        if (error instanceof UploadCanceledError || isItemCanceled(item.id)) {
          setItems((currentItems) =>
            updateUploadQueueItem(currentItems, item.id, {
              status: "canceled",
              errorMessage: null,
            }),
          );
        } else if (isDuplicateUploadError(error)) {
          setItems((currentItems) =>
            updateUploadQueueItem(currentItems, item.id, {
              status: "duplicate",
              errorMessage: "名称重复",
            }),
          );
        } else {
          const message = toErrorMessage(error);
          setItems((currentItems) =>
            updateUploadQueueItem(currentItems, item.id, {
              status: "failed",
              errorMessage: message,
            }),
          );
        }
      } finally {
        uploadTasksRef.current.delete(item.id);
        activeIdsRef.current.delete(item.id);
        processQueueRef.current();
        finishIdleBatch();
      }
    },
    [finishIdleBatch, isItemCanceled, setItems],
  );

  const processQueue = useCallback(() => {
    while (activeIdsRef.current.size < MAX_CONCURRENT_UPLOADS) {
      const nextItem = itemsRef.current.find(
        (item) => item.status === "queued" && !activeIdsRef.current.has(item.id),
      );
      if (!nextItem) {
        break;
      }
      const startPromise = startItem(nextItem);
      activeItemPromisesRef.current.set(nextItem.id, startPromise);
      void startPromise.finally(() => {
        activeItemPromisesRef.current.delete(nextItem.id);
      });
    }
  }, [startItem]);

  processQueueRef.current = processQueue;

  const enqueueUploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const selectedFiles = Array.from(files);
      if (selectedFiles.length === 0) {
        return;
      }

      clearSuccessDismissTimer();
      const limits = await fetchUploadLimits().catch(() => ({
        success: true as const,
        maxFileBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
        maxBatchBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
      }));
      const nextItems = createUploadQueueItems({
        files: selectedFiles,
        currentPath,
        maxFileBytes: limits.maxFileBytes,
        maxBatchBytes: limits.maxBatchBytes,
      });

      setItems(() => nextItems);
      itemsRef.current = nextItems;
      setIsPanelMinimized(false);
      ensureParentFoldersRef.current = createFolderEnsureer(createFolder);
      uploadedSinceIdleRef.current = false;
      processQueueRef.current();
    },
    [clearSuccessDismissTimer, currentPath, setItems],
  );

  const cancelRemainingUploads = useCallback(() => {
    const remainingIds = new Set(
      itemsRef.current.filter((item) => REMAINING_STATUSES.has(item.status)).map((item) => item.id),
    );
    cancelUploadIds(remainingIds);
    finishIdleBatch();
  }, [cancelUploadIds, finishIdleBatch]);

  const cancelUploadsInFolderAndWait = useCallback(
    async (folderPath: string) => {
      const activeItems = getActiveUploadItemsInFolder(itemsRef.current, folderPath);
      const activeIds = new Set(activeItems.map((item) => item.id));
      const promises = activeItems
        .map((item) => activeItemPromisesRef.current.get(item.id))
        .filter((promise): promise is Promise<void> => Boolean(promise));

      cancelUploadIds(activeIds);
      processQueueRef.current();
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
      finishIdleBatch();
    },
    [cancelUploadIds, finishIdleBatch],
  );

  const retryUpload = useCallback(
    (id: string) => {
      clearSuccessDismissTimer();
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? resetFailedUploadItem(item) : item)),
      );
      processQueueRef.current();
    },
    [clearSuccessDismissTimer, setItems],
  );

  const minimizePanel = useCallback(() => {
    setIsPanelMinimized(true);
  }, []);

  const restorePanel = useCallback(() => {
    setIsPanelMinimized(false);
  }, []);

  const closePanel = useCallback(() => {
    clearSuccessDismissTimer();
    itemsRef.current = [];
    setItemsState([]);
    setIsPanelMinimized(false);
  }, [clearSuccessDismissTimer]);

  const panelState = getUploadQueuePanelState(items);

  useEffect(() => {
    return clearSuccessDismissTimer;
  }, [clearSuccessDismissTimer]);

  return {
    items,
    stats: countUploadQueueStats(items),
    panelState,
    isPanelMinimized,
    isUploading: countUploadQueueStats(items).active > 0,
    enqueueUploadFiles,
    cancelUpload,
    cancelUploadsInFolderAndWait,
    cancelRemainingUploads,
    retryUpload,
    minimizePanel,
    restorePanel,
    closePanel,
  };
}
