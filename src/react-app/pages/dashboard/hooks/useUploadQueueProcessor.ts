import { useCallback, useRef } from "react";
import type { UploadQueueItem } from "../../../../types";
import { UploadCanceledError, uploadFileWithProgress } from "../../../utils/fileUpload";
import {
  updateUploadQueueItem,
  isDuplicateUploadError,
  toErrorMessage,
} from "./uploadQueueUtils";

export type UploadTask = ReturnType<typeof uploadFileWithProgress>;

type MutableValueRef<T> = {
  current: T;
};

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
    [
      activeIdsRef,
      ensureParentFoldersRef,
      finishIdleBatch,
      isItemCanceled,
      processQueueRef,
      setItems,
      uploadTasksRef,
      uploadedSinceIdleRef,
    ],
  );

  const processQueue = useCallback(() => {
    while (activeIdsRef.current.size < maxConcurrentUploads) {
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
  }, [activeIdsRef, activeItemPromisesRef, itemsRef, maxConcurrentUploads, startItem]);

  processQueueRef.current = processQueue;

  return processQueueRef;
}
