import { useRef } from "react";
import PQueue from "p-queue";
import type { UploadQueueItem } from "../../../../types";
import { UploadCanceledError, uploadFileWithProgress } from "../../../utils/fileUpload";
import {
  getNextUploadQueueProgress,
  updateUploadQueueItem,
  isDuplicateUploadError,
  toErrorMessage,
} from "./uploadQueueUtils";

export type UploadTask = ReturnType<typeof uploadFileWithProgress>;

type MutableValueRef<T> = {
  current: T;
};

function useLazyRef<T>(createValue: () => T): MutableValueRef<T> {
  const ref = useRef<T | null>(null);
  if (ref.current === null) {
    ref.current = createValue();
  }
  return ref as MutableValueRef<T>;
}

type UseUploadQueueProcessorArgs = {
  activeIdsRef: MutableValueRef<Set<string>>;
  activeItemPromisesRef: MutableValueRef<Map<string, Promise<void>>>;
  ensureParentFoldersRef: MutableValueRef<
    (parentPath: string, isCanceled: () => boolean) => Promise<void>
  >;
  finishIdleBatch: () => void;
  isItemCanceled: (id: string) => boolean;
  maxConcurrentUploads: number;
  setItems: (updater: (items: UploadQueueItem[]) => UploadQueueItem[]) => void;
  uploadTasksRef: MutableValueRef<Map<string, UploadTask>>;
  uploadedSinceIdleRef: MutableValueRef<boolean>;
  itemsRef: MutableValueRef<UploadQueueItem[]>;
};

export function useUploadQueueProcessor({
  activeIdsRef,
  activeItemPromisesRef,
  ensureParentFoldersRef,
  finishIdleBatch,
  isItemCanceled,
  itemsRef,
  maxConcurrentUploads,
  setItems,
  uploadTasksRef,
  uploadedSinceIdleRef,
}: UseUploadQueueProcessorArgs) {
  const scheduledIdsRef = useLazyRef(() => new Set<string>());
  const uploadQueueRef = useLazyRef(() => new PQueue({ concurrency: maxConcurrentUploads }));

  async function startItem(item: UploadQueueItem) {
    if (isItemCanceled(item.id)) {
      return;
    }

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
        }),
      );

      const task = uploadFileWithProgress({
        file: item.file,
        parentPath: item.parentPath,
        onProgress: (progress) => {
          setItems((currentItems) =>
            currentItems.map((currentItem) =>
              currentItem.id === item.id
                ? {
                    ...currentItem,
                    progress: getNextUploadQueueProgress(currentItem.progress, progress),
                  }
                : currentItem,
            ),
          );
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
            progress: 0,
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
      processQueue();
      finishIdleBatch();
    }
  }

  function processQueue() {
    uploadQueueRef.current.concurrency = maxConcurrentUploads;

    for (const nextItem of itemsRef.current) {
      if (nextItem.status !== "queued" || scheduledIdsRef.current.has(nextItem.id)) {
        continue;
      }

      scheduledIdsRef.current.add(nextItem.id);
      const startPromise = uploadQueueRef.current.add(() => startItem(nextItem), {
        id: nextItem.id,
      });
      activeItemPromisesRef.current.set(nextItem.id, startPromise);
      void startPromise.finally(() => {
        scheduledIdsRef.current.delete(nextItem.id);
        activeItemPromisesRef.current.delete(nextItem.id);
      });
    }
  }

  return processQueue;
}
