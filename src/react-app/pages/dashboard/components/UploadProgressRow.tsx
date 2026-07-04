import MdiCloseCircleOutline from "~icons/mdi/close-circle-outline";
import MdiRefresh from "~icons/mdi/refresh";
import type { UploadQueueItem, UploadQueueStatus } from "../../../../types";
import {
  cancelDashboardUpload,
  getUploadQueueItemProgress,
  retryDashboardUpload,
} from "../hooks/useUploadQueue";
import { cn } from "../../../utils/cn";
import { formatBytes } from "../../../utils/fileFormatters";
import { getUploadProgressRowBackgroundStyle } from "./uploadProgressRowStyle";

interface UploadProgressRowProps {
  item: UploadQueueItem;
}

const STATUS_LABELS: Record<UploadQueueStatus, string> = {
  queued: "等待中",
  preparing: "准备中",
  uploading: "上传中",
  success: "已完成",
  failed: "上传失败",
  canceled: "已取消",
  oversized: "文件过大",
  duplicate: "名称重复",
};

function canCancelItem(status: UploadQueueStatus): boolean {
  return status === "queued" || status === "preparing" || status === "uploading";
}

const STATUS_BADGE_CLASS_NAMES: Record<UploadQueueStatus, string> = {
  queued: "badge-neutral",
  preparing: "badge-info",
  uploading: "badge-info",
  success: "badge-success",
  failed: "badge-error",
  canceled: "badge-neutral",
  oversized: "badge-warning",
  duplicate: "badge-warning",
};

export function UploadProgressRow({ item }: UploadProgressRowProps) {
  const progress = getUploadQueueItemProgress(item);
  const statusMessage = item.errorMessage ?? STATUS_LABELS[item.status];

  return (
    <li
      className="rounded-box bg-base-200/70 bg-[linear-gradient(to_right,var(--upload-row-progress-color),var(--upload-row-progress-color))] bg-no-repeat px-3 py-2 transition-[background-size] duration-200 ease-out [background-size:var(--upload-row-progress)_100%]"
      style={getUploadProgressRowBackgroundStyle(progress, item.status)}
    >
      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={item.displayPath}>
          {item.displayPath}
        </p>
        <span className="shrink-0 text-xs text-base-content/60">{formatBytes(item.size)}</span>
        <span
          className={cn("badge badge-xs shrink-0", STATUS_BADGE_CLASS_NAMES[item.status])}
          title={statusMessage}
        >
          {STATUS_LABELS[item.status]}
        </span>
        <span className="shrink-0 text-xs font-medium tabular-nums">{progress}%</span>
        {item.status === "failed" ? (
          <div className="tooltip tooltip-left shrink-0" data-tip="重试">
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square"
              onClick={() => retryDashboardUpload(item.id)}
              aria-label={`重试上传 ${item.displayPath}`}
            >
              <MdiRefresh className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {canCancelItem(item.status) ? (
          <div className="tooltip tooltip-left shrink-0" data-tip="取消">
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-error"
              onClick={() => cancelDashboardUpload(item.id)}
              aria-label={`取消上传 ${item.displayPath}`}
            >
              <MdiCloseCircleOutline className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
