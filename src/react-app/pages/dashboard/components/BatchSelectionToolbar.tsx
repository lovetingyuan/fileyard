import MdiClose from "~icons/mdi/close";
import MdiDeleteOutline from "~icons/mdi/delete-outline";
import MdiFolderMoveOutline from "~icons/mdi/folder-move-outline";
import MdiShareVariantOutline from "~icons/mdi/share-variant-outline";
import { useAppStore } from "../../../store";
import {
  clearDashboardSelection,
  openBatchFileShare,
  requestBatchDeleteTargets,
  requestBatchMoveTargets,
} from "../actions";
import {
  canShareDashboardSelection,
  getDashboardSelectionShareDisabledReason,
} from "../utils/batchShareSelection";

export function BatchSelectionToolbar() {
  const { batchDeleting, batchMoving, selectedDashboardTargets, sharing } = useAppStore();
  const isBusy = batchDeleting || batchMoving || sharing;
  const isEmpty = selectedDashboardTargets.length === 0;
  const canShareSelection = canShareDashboardSelection(selectedDashboardTargets);
  const shareDisabledReason = getDashboardSelectionShareDisabledReason(selectedDashboardTargets);
  const canMoveSelection = selectedDashboardTargets.length > 0;

  return (
    <div className="ml-auto flex w-max max-w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
      <span className="shrink-0 text-sm text-base-content/70">
        已选择 {selectedDashboardTargets.length} 项
      </span>
      <div className="tooltip" data-tip={shareDisabledReason ?? "分享选中文件"}>
        <button
          type="button"
          className="btn btn-secondary btn-square btn-sm"
          disabled={isBusy || !canShareSelection}
          onClick={() => openBatchFileShare(selectedDashboardTargets)}
          aria-label="分享选中文件"
        >
          <MdiShareVariantOutline className="h-5 w-5" />
        </button>
      </div>
      <div className="tooltip" data-tip="删除选中项">
        <button
          type="button"
          className="btn btn-error btn-square btn-sm text-error-content"
          disabled={isBusy || isEmpty}
          onClick={requestBatchDeleteTargets}
          aria-label="删除选中项"
        >
          <MdiDeleteOutline className="h-5 w-5" />
        </button>
      </div>
      <div className="tooltip" data-tip="移动选中项">
        <button
          type="button"
          className="btn btn-primary btn-square btn-sm"
          disabled={isBusy || !canMoveSelection}
          onClick={requestBatchMoveTargets}
          aria-label="移动选中项"
        >
          <MdiFolderMoveOutline className="h-5 w-5" />
        </button>
      </div>
      <div className="tooltip" data-tip="取消多选">
        <button
          type="button"
          className="btn btn-ghost btn-square btn-sm"
          disabled={isBusy}
          onClick={clearDashboardSelection}
          aria-label="取消多选"
        >
          <MdiClose className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
