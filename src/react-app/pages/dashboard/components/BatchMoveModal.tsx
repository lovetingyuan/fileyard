import { useState } from "react";
import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import MdiFolderOpenOutline from "~icons/mdi/folder-open-outline";
import toast from "react-hot-toast";
import type { BatchFileOperationResult, BatchOperationTarget } from "../../../../types";
import { Dialog } from "../../../components/Dialog";
import { useBatchMoveEntriesMutation, useFolderTree } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { getBatchMoveDestinationDisabledReason } from "../../../utils/moveValidation";
import {
  closeBatchMoveTargets,
  replaceDashboardSelectionWithFailedResults,
  setBatchMoving,
} from "../actions";
import { useDashboardFileView } from "../hooks/useDashboardFileView";
import {
  FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE,
  isFolderOperationBlockedByActiveUpload,
} from "../hooks/useUploadQueue";
import { FolderTreePicker } from "./FolderTreePicker";

function getTargetKey(target: Pick<BatchOperationTarget, "path" | "type">) {
  return `${target.type}:${target.path}`;
}

function BatchMoveFailureList({
  results,
  sourceTargets,
}: {
  results: BatchFileOperationResult[];
  sourceTargets: BatchOperationTarget[];
}) {
  const sourceTargetsByKey = new Map(sourceTargets.map((target) => [getTargetKey(target), target]));
  const failedResults = results.filter((result) => !result.success);

  if (failedResults.length === 0) {
    return null;
  }

  return (
    <div className="alert alert-error items-start py-3 text-sm">
      <MdiAlertCircleOutline className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 space-y-2">
        <p>{failedResults.length} 项移动失败</p>
        <ul className="max-h-32 space-y-1 overflow-auto">
          {failedResults.map((result) => {
            const target = sourceTargetsByKey.get(getTargetKey(result));
            return (
              <li key={getTargetKey(result)} className="break-all text-error-content/90">
                {target?.name ?? result.path}：{result.message}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function BatchMoveModal() {
  const { batchMoving, pendingBatchMoveTargets, uploadQueue } = useAppStore();
  const { tree, error, isLoading } = useFolderTree(Boolean(pendingBatchMoveTargets));
  const { batchMoveEntries } = useBatchMoveEntriesMutation();
  const { refresh } = useDashboardFileView();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [failureResults, setFailureResults] = useState<BatchFileOperationResult[]>([]);

  if (!pendingBatchMoveTargets) {
    return null;
  }

  const selectedDisabledReason =
    selectedPath === null
      ? null
      : getBatchMoveDestinationDisabledReason(selectedPath, pendingBatchMoveTargets);
  const confirmDisabled =
    selectedPath === null || Boolean(selectedDisabledReason) || batchMoving || isLoading || !tree;

  const handleClose = () => {
    if (!batchMoving) {
      closeBatchMoveTargets();
      setFailureResults([]);
    }
  };

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    setFailureResults([]);
  };

  const handleMove = async () => {
    if (confirmDisabled || selectedPath === null) {
      return;
    }

    if (
      pendingBatchMoveTargets.some(
        (target) =>
          target.type === "folder" &&
          isFolderOperationBlockedByActiveUpload(uploadQueue, target.path),
      )
    ) {
      toast.error(FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE);
      return;
    }

    const targets = pendingBatchMoveTargets;
    setBatchMoving(true);
    setFailureResults([]);
    try {
      const response = await batchMoveEntries(
        targets.map((target) => ({ type: target.type, path: target.path })),
        selectedPath,
      );
      await refresh();
      replaceDashboardSelectionWithFailedResults(targets, response.results);
      if (response.failedCount === 0) {
        toast.success(`已移动 ${response.completedCount} 项`);
        closeBatchMoveTargets();
        return;
      }

      setFailureResults(response.results);
    } catch (error) {
      await refresh();
      toast.error(error instanceof Error ? error.message : "批量移动失败");
    } finally {
      setBatchMoving(false);
    }
  };

  return (
    <Dialog
      isOpen
      title="批量移动"
      onClose={handleClose}
      onConfirm={handleMove}
      confirmText="移动"
      confirmPendingText="移动中..."
      confirmDisabled={confirmDisabled}
      confirmLoading={batchMoving}
      isDismissDisabled={batchMoving}
      supportFullscreen
      boxClassName="max-w-lg border border-base-300/70 bg-base-100"
      bodyClassName="flex-1 min-h-0"
      closeButtonAriaLabel="关闭批量移动弹窗"
    >
      {({ isFullscreen, isInteractionDisabled }) => (
        <div className="flex h-full min-h-0 flex-col gap-4">
          <p className="text-sm leading-6 text-base-content/70">
            选择 {pendingBatchMoveTargets.length} 个项目的目标文件夹
          </p>

          <div
            className={`${
              isFullscreen ? "flex-1 min-h-0" : "max-h-80"
            } overflow-auto rounded-box border border-base-300 bg-base-200/40 p-2`}
          >
            {isLoading && !tree ? (
              <div className="flex items-center justify-center py-10">
                <span className="loading loading-spinner loading-md text-primary"></span>
              </div>
            ) : error ? (
              <div className="flex items-start gap-2 rounded-box bg-error/10 p-3 text-sm text-error">
                <MdiAlertCircleOutline className="mt-0.5 h-4 w-4 shrink-0" />
                <span>文件夹树加载失败</span>
              </div>
            ) : tree ? (
              <FolderTreePicker
                Icon={MdiFolderOpenOutline}
                getDisabledReason={(path) =>
                  getBatchMoveDestinationDisabledReason(path, pendingBatchMoveTargets)
                }
                isInteractionDisabled={isInteractionDisabled}
                onSelect={handleSelect}
                selectedPath={selectedPath}
                tree={tree}
              />
            ) : null}
          </div>

          <BatchMoveFailureList results={failureResults} sourceTargets={pendingBatchMoveTargets} />
        </div>
      )}
    </Dialog>
  );
}
