import { useCallback, useRef, useState } from "react";
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

type UploadQueueStats = {
  total: number;
  remaining: number;
  failed: number;
  active: number;
  hasVisibleStatus: boolean;
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

export function useUploadQueue({ currentPath, onUploadsComplete }: UseUploadQueueArgs) {
  const [items, setItemsState] = useState<UploadQueueItem[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const itemsRef = useRef<UploadQueueItem[]>([]);
  const activeIdsRef = useRef(new Set<string>());
  const uploadTasksRef = useRef(new Map<string, UploadTask>());
  const ensureParentFoldersRef = useRef(createFolderEnsureer(createFolder));
  const uploadedSinceIdleRef = useRef(false);

  const setItems = useCallback((updater: (items: UploadQueueItem[]) => UploadQueueItem[]) => {
    setItemsState((currentItems) => {
      const nextItems = updater(currentItems);
      itemsRef.current = nextItems;
      return nextItems;
    });
  }, []);

  const isItemCanceled = useCallback((id: string) => {
    return itemsRef.current.find((item) => item.id === id)?.status === "canceled";
  }, []);

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
  }, [onUploadsComplete]);

  const processQueueRef = useRef<() => void>(() => undefined);

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
          setItems((currentItems) =>
            updateUploadQueueItem(currentItems, item.id, {
              status: "failed",
              errorMessage: toErrorMessage(error),
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
      void startItem(nextItem);
    }
  }, [startItem]);

  processQueueRef.current = processQueue;

  const enqueueUploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const selectedFiles = Array.from(files);
      if (selectedFiles.length === 0) {
        return;
      }

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
      ensureParentFoldersRef.current = createFolderEnsureer(createFolder);
      uploadedSinceIdleRef.current = false;
      processQueueRef.current();
    },
    [currentPath, setItems],
  );

  const cancelUpload = useCallback(
    (id: string) => {
      uploadTasksRef.current.get(id)?.cancel();
      setItems((currentItems) =>
        updateUploadQueueItem(currentItems, id, {
          status: "canceled",
          errorMessage: null,
        }),
      );
      processQueueRef.current();
      finishIdleBatch();
    },
    [finishIdleBatch, setItems],
  );

  const cancelRemainingUploads = useCallback(() => {
    for (const task of uploadTasksRef.current.values()) {
      task.cancel();
    }
    setItems((currentItems) =>
      currentItems.map((item) =>
        REMAINING_STATUSES.has(item.status)
          ? { ...item, status: "canceled", errorMessage: null }
          : item,
      ),
    );
    finishIdleBatch();
  }, [finishIdleBatch, setItems]);

  const retryUpload = useCallback(
    (id: string) => {
      setItems((currentItems) =>
        currentItems.map((item) => (item.id === id ? resetFailedUploadItem(item) : item)),
      );
      processQueueRef.current();
    },
    [setItems],
  );

  return {
    items,
    stats: countUploadQueueStats(items),
    summaryText: getUploadQueueSummary(items),
    isDetailsOpen,
    isUploading: countUploadQueueStats(items).active > 0,
    enqueueUploadFiles,
    cancelUpload,
    cancelRemainingUploads,
    retryUpload,
    showDetails: () => setIsDetailsOpen(true),
    closeDetails: () => setIsDetailsOpen(false),
  };
}
