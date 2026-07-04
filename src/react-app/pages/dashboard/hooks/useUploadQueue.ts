import { useRef } from "react";
import toast from "react-hot-toast";
import type { UploadQueueItem } from "../../../../types";
import { getStoreMethods, useAppStore } from "../../../store";
import {
  FILE_UPLOAD_BATCH_LIMIT_BYTES,
  createUploadQueueItems,
  filterFilesAlreadyInUploadQueue,
} from "../../../utils/uploadSelection";
import { createFolder, fetchUploadLimits } from "./uploadQueueApi";
import {
  type UploadQueueControls,
  useUploadQueueControlsRegistration,
} from "./uploadQueueControls";
import {
  REMAINING_STATUSES,
  appendUploadQueueItems,
  clearUploadQueueTasks,
  countUploadQueueStats,
  createFolderEnsureer,
  getActiveUploadItemsInFolder,
  getUploadQueuePanelState,
  resetFailedUploadItem,
} from "./uploadQueueUtils";
import { type UploadTask, useUploadQueueProcessor } from "./useUploadQueueProcessor";

export {
  cancelDashboardUpload,
  cancelDashboardUploadsInFolderAndWait,
  cancelRemainingDashboardUploads,
  closeDashboardUploadPanel,
  enqueueDashboardUploadFiles,
  minimizeDashboardUploadPanel,
  restoreDashboardUploadPanel,
  retryDashboardUpload,
} from "./uploadQueueControls";
export {
  FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE,
  countUploadQueueStats,
  getActiveUploadItemsInFolder,
  getUploadQueueItemProgress,
  getUploadQueuePanelState,
  isFolderOperationBlockedByActiveUpload,
} from "./uploadQueueUtils";
export type { UploadQueuePanelState } from "./uploadQueueUtils";

const MAX_CONCURRENT_UPLOADS = 3;
const DUPLICATE_UPLOAD_TOAST_ID = "dashboard-upload-duplicate-in-queue";

type UseUploadQueueArgs = {
  currentPath: string;
  onUploadsComplete: () => Promise<void> | void;
};

function useLazyRef<T>(createValue: () => T): { current: T } {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = createValue();
  }
  return ref as { current: T };
}

function getDuplicateUploadToastMessage(ignoredCount: number): string {
  return ignoredCount === 1
    ? "该文件已在上传列表中，已忽略"
    : `${ignoredCount} 个文件已在上传列表中，已忽略`;
}

export function useUploadQueue({ currentPath, onUploadsComplete }: UseUploadQueueArgs) {
  const { isUploadPanelMinimized, uploadQueue: items } = useAppStore();
  const { setIsUploadPanelMinimized, setUploadQueue } = getStoreMethods();
  const itemsRef = useRef<UploadQueueItem[]>(items);
  const activeIdsRef = useLazyRef(() => new Set<string>());
  const activeItemPromisesRef = useLazyRef(() => new Map<string, Promise<void>>());
  const uploadTasksRef = useLazyRef(() => new Map<string, UploadTask>());
  const ensureParentFoldersRef = useLazyRef(() => createFolderEnsureer(createFolder));
  const uploadedSinceIdleRef = useRef(false);

  const setItems = (updater: (items: UploadQueueItem[]) => UploadQueueItem[]) => {
    const nextItems = updater(itemsRef.current);
    itemsRef.current = nextItems;
    setUploadQueue(nextItems);
  };

  const isItemCanceled = (id: string) => {
    const item = itemsRef.current.find((currentItem) => currentItem.id === id);
    return !item || item.status === "canceled";
  };

  const finishIdleBatch = () => {
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
  };

  const processQueue = useUploadQueueProcessor({
    activeIdsRef,
    activeItemPromisesRef,
    ensureParentFoldersRef,
    finishIdleBatch,
    isItemCanceled,
    itemsRef,
    maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,
    setItems,
    uploadTasksRef,
    uploadedSinceIdleRef,
  });

  const cancelUploadIds = (ids: Set<string>) => {
    if (ids.size === 0) {
      return;
    }

    for (const id of ids) {
      uploadTasksRef.current.get(id)?.cancel();
    }
    const nextItems = itemsRef.current.map((item) =>
      ids.has(item.id) && REMAINING_STATUSES.has(item.status)
        ? { ...item, status: "canceled" as const, errorMessage: null }
        : item,
    );
    itemsRef.current = nextItems;
    setUploadQueue(nextItems);
  };

  const cancelUpload = (id: string) => {
    cancelUploadIds(new Set([id]));
    processQueue();
    finishIdleBatch();
  };

  const enqueueUploadFiles = async (files: FileList | File[]) => {
    const selectedFiles = Array.from(files);
    if (selectedFiles.length === 0) {
      return;
    }

    const { acceptedFiles, ignoredCount } = filterFilesAlreadyInUploadQueue({
      files: selectedFiles,
      currentPath,
      uploadQueue: itemsRef.current,
    });

    if (ignoredCount > 0) {
      toast.error(getDuplicateUploadToastMessage(ignoredCount), {
        id: DUPLICATE_UPLOAD_TOAST_ID,
      });
    }

    if (acceptedFiles.length === 0) {
      return;
    }

    const limits = await fetchUploadLimits().catch(() => ({
      success: true as const,
      maxFileBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
      maxBatchBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
    }));
    const nextItems = createUploadQueueItems({
      files: acceptedFiles,
      currentPath,
      maxFileBytes: limits.maxFileBytes,
      maxBatchBytes: limits.maxBatchBytes,
    });

    setItems((currentItems) => appendUploadQueueItems(currentItems, nextItems));
    setIsUploadPanelMinimized(false);
    uploadedSinceIdleRef.current = false;
    processQueue();
  };

  const cancelRemainingUploads = () => {
    const remainingIds = new Set<string>();
    for (const item of itemsRef.current) {
      if (REMAINING_STATUSES.has(item.status)) {
        remainingIds.add(item.id);
      }
    }
    cancelUploadIds(remainingIds);
    finishIdleBatch();
  };

  const cancelUploadsInFolderAndWait = async (folderPath: string) => {
    const activeItems = getActiveUploadItemsInFolder(itemsRef.current, folderPath);
    const activeIds = new Set(activeItems.map((item) => item.id));
    const promises: Promise<void>[] = [];
    for (const item of activeItems) {
      const promise = activeItemPromisesRef.current.get(item.id);
      if (promise) {
        promises.push(promise);
      }
    }

    cancelUploadIds(activeIds);
    processQueue();
    if (promises.length > 0) {
      await Promise.allSettled(promises);
    }
    finishIdleBatch();
  };

  const retryUpload = (id: string) => {
    setItems((currentItems) =>
      currentItems.map((item) => (item.id === id ? resetFailedUploadItem(item) : item)),
    );
    processQueue();
  };

  const minimizePanel = () => {
    setIsUploadPanelMinimized(true);
  };

  const restorePanel = () => {
    setIsUploadPanelMinimized(false);
  };

  const closePanel = () => {
    clearUploadQueueTasks({
      activeIds: activeIdsRef.current,
      activeItemPromises: activeItemPromisesRef.current,
      uploadTasks: uploadTasksRef.current,
    });
    uploadedSinceIdleRef.current = false;
    itemsRef.current = [];
    setUploadQueue([]);
    setIsUploadPanelMinimized(false);
  };

  const controls: UploadQueueControls = {
    enqueueUploadFiles,
    cancelUpload,
    cancelUploadsInFolderAndWait,
    cancelRemainingUploads,
    retryUpload,
    minimizePanel,
    restorePanel,
    closePanel,
  };
  useUploadQueueControlsRegistration(controls);

  return {
    items,
    stats: countUploadQueueStats(items),
    panelState: getUploadQueuePanelState(items),
    isPanelMinimized: isUploadPanelMinimized,
    isUploading: countUploadQueueStats(items).active > 0,
    ...controls,
  };
}
