import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import { useState } from "react";
import toast from "react-hot-toast";
import type { BatchFileOperationResult, BatchOperationTarget } from "../../../../types";
import { Dialog } from "../../../components/Dialog";
import { useBatchDeleteEntriesMutation } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import {
  closeBatchDeleteTargets,
  replaceDashboardSelectionWithFailedResults,
  setBatchDeleting,
} from "../actions";
import { useDashboardFileView } from "../hooks/useDashboardFileView";
import { getBatchDeleteBlockedReason } from "../utils/batchDeleteSelection";

function getTargetKey(target: Pick<BatchOperationTarget, "path" | "type">) {
  return `${target.type}:${target.path}`;
}

function BatchFailureList({
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
    <div role="alert" className="alert alert-error items-start py-3 text-sm">
      <MdiAlertCircleOutline className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 space-y-2">
        <p>{failedResults.length} 项操作失败</p>
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

export function BatchDeleteConfirmModal() {
  const { batchDeleting, pendingBatchDeleteTargets } = useAppStore();
  const { refresh } = useDashboardFileView();
  const { batchDeleteEntries } = useBatchDeleteEntriesMutation();
  const [failureResults, setFailureResults] = useState<BatchFileOperationResult[]>([]);

  if (!pendingBatchDeleteTargets) {
    return null;
  }

  const blockedReason = getBatchDeleteBlockedReason(pendingBatchDeleteTargets);

  const handleClose = () => {
    if (!batchDeleting) {
      closeBatchDeleteTargets();
      setFailureResults([]);
    }
  };

  const handleConfirm = async () => {
    if (batchDeleting || blockedReason) {
      return;
    }

    const targets = pendingBatchDeleteTargets;
    setBatchDeleting(true);
    setFailureResults([]);
    try {
      const response = await batchDeleteEntries(
        targets.map((target) => ({ type: target.type, path: target.path })),
      );
      await refresh();
      replaceDashboardSelectionWithFailedResults(targets, response.results);
      if (response.failedCount === 0) {
        toast.success(`已删除 ${response.completedCount} 项`);
        closeBatchDeleteTargets();
        return;
      }

      setFailureResults(response.results);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "批量删除失败");
    } finally {
      setBatchDeleting(false);
    }
  };

  return (
    <Dialog
      isOpen
      title="批量删除"
      onClose={handleClose}
      onConfirm={handleConfirm}
      confirmText="确认删除"
      confirmPendingText="删除中..."
      confirmDisabled={Boolean(blockedReason)}
      confirmLoading={batchDeleting}
      isDismissDisabled={batchDeleting}
      boxClassName="max-w-md border border-error/10 bg-base-100"
      closeButtonAriaLabel="关闭批量删除确认弹窗"
      confirmButtonClassName="btn btn-sm btn-error text-error-content"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/12 text-error">
            <MdiAlertCircleOutline className="h-5 w-5" />
          </span>
          <div className="space-y-2 text-sm leading-6 text-base-content/70">
            <p>确认删除选中的 {pendingBatchDeleteTargets.length} 项吗？此操作无法撤销。</p>
          </div>
        </div>
        {blockedReason ? (
          <div role="alert" className="alert alert-warning items-start py-3 text-sm">
            <MdiAlertCircleOutline className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{blockedReason}</span>
          </div>
        ) : null}
        <BatchFailureList results={failureResults} sourceTargets={pendingBatchDeleteTargets} />
      </div>
    </Dialog>
  );
}
