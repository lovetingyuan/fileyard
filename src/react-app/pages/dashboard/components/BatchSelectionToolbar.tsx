import MdiClose from "~icons/mdi/close";
import MdiDeleteOutline from "~icons/mdi/delete-outline";
import MdiFolderMoveOutline from "~icons/mdi/folder-move-outline";
import { useAppStore } from "../../../store";
import {
  clearDashboardSelection,
  requestBatchDeleteTargets,
  requestBatchMoveTargets,
} from "../actions";

export function BatchSelectionToolbar() {
  const { batchDeleting, batchMoving, selectedDashboardTargets } = useAppStore();
  const isBusy = batchDeleting || batchMoving;
  const isEmpty = selectedDashboardTargets.length === 0;

  return (
    <div className="ml-auto flex w-max max-w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
      <span className="shrink-0 text-sm text-base-content/70">
        已选择 {selectedDashboardTargets.length} 项
      </span>
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
          disabled={isBusy || isEmpty}
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
