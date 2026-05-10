import MdiCloseCircleOutline from "~icons/mdi/close-circle-outline";
import MdiRefresh from "~icons/mdi/refresh";
import type { UploadQueueItem, UploadQueueStatus } from "../../types";
import { getUploadQueueItemProgress } from "../hooks/useUploadQueue";
import { formatBytes } from "../utils/fileFormatters";

interface UploadProgressRowProps {
  item: UploadQueueItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
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
  queued: "border-slate-200 bg-slate-100 text-slate-700",
  preparing: "border-sky-200 bg-sky-100 text-sky-700",
  uploading: "border-cyan-200 bg-cyan-100 text-cyan-800",
  success: "border-emerald-200 bg-emerald-100 text-emerald-700",
  failed: "border-rose-200 bg-rose-100 text-rose-700",
  canceled: "border-zinc-300 bg-zinc-200 text-zinc-700",
  oversized: "border-amber-200 bg-amber-100 text-amber-800",
  duplicate: "border-violet-200 bg-violet-100 text-violet-700",
};

export function UploadProgressRow({ item, onCancel, onRetry }: UploadProgressRowProps) {
  const progress = getUploadQueueItemProgress(item);
  const statusMessage = item.errorMessage ?? STATUS_LABELS[item.status];

  return (
    <li className="rounded-box bg-base-200/70 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-medium" title={item.displayPath}>
          {item.displayPath}
        </p>
        <span className="shrink-0 text-xs text-base-content/60">{formatBytes(item.size)}</span>
        <span
          className={`badge badge-xs shrink-0 ${STATUS_BADGE_CLASS_NAMES[item.status]}`}
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
              onClick={() => onRetry(item.id)}
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
              onClick={() => onCancel(item.id)}
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
