import MdiCloseCircleOutline from "~icons/mdi/close-circle-outline";
import MdiRefresh from "~icons/mdi/refresh";
import type { UploadQueueItem, UploadQueueStatus } from "../../types";
import { formatBytes } from "../utils/fileFormatters";
import { countUploadQueueStats } from "../hooks/useUploadQueue";
import { Dialog } from "./Dialog";

interface UploadDetailsModalProps {
  isOpen: boolean;
  items: UploadQueueItem[];
  onClose: () => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onCancelRemaining: () => void;
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

function canCancel(status: UploadQueueStatus): boolean {
  return (
    status === "queued" ||
    status === "preparing" ||
    status === "uploading" ||
    status === "oversized" ||
    status === "duplicate"
  );
}

function getProgressValue(item: UploadQueueItem): number {
  if (item.status === "success") {
    return 100;
  }
  if (item.status === "queued" || item.status === "preparing") {
    return 0;
  }
  return item.progress;
}

function getStatusClassName(status: UploadQueueStatus): string {
  if (status === "success") {
    return "badge-success";
  }
  if (status === "failed" || status === "oversized" || status === "duplicate") {
    return "badge-error";
  }
  if (status === "canceled") {
    return "badge-neutral";
  }
  return "badge-info";
}

function UploadItemRow({
  item,
  onCancel,
  onRetry,
}: {
  item: UploadQueueItem;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const progress = getProgressValue(item);
  const statusMessage = item.errorMessage ?? STATUS_LABELS[item.status];

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
          <p
            className="min-w-0 flex-[1_1_14rem] break-all text-sm font-medium leading-5"
            title={item.displayPath}
          >
            {item.displayPath}
          </p>
          <span className="shrink-0 text-xs text-base-content/60">{formatBytes(item.size)}</span>
          <span className="shrink-0 text-xs font-medium tabular-nums">{progress}%</span>
          <span className={`badge badge-xs ${getStatusClassName(item.status)}`}>
            {STATUS_LABELS[item.status]}
          </span>
          {item.errorMessage ? <span className="text-xs text-error">{statusMessage}</span> : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {item.status === "failed" ? (
            <button type="button" className="btn btn-ghost btn-xs" onClick={() => onRetry(item.id)}>
              <MdiRefresh className="h-4 w-4" />
              重试
            </button>
          ) : null}
          {canCancel(item.status) ? (
            <button
              type="button"
              className="btn btn-ghost btn-xs text-error"
              onClick={() => onCancel(item.id)}
            >
              <MdiCloseCircleOutline className="h-4 w-4" />
              取消
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export function UploadDetailsModal({
  isOpen,
  items,
  onClose,
  onCancel,
  onRetry,
  onCancelRemaining,
}: UploadDetailsModalProps) {
  const stats = countUploadQueueStats(items);
  const isUploadComplete = stats.remaining === 0;
  const visibleItems = items.filter((item) => item.status !== "success");

  return (
    <Dialog
      isOpen={isOpen}
      title="上传详情"
      onClose={onClose}
      showCancelButton={false}
      showConfirmButton={false}
      widthMode="content"
      boxClassName="w-[min(52rem,95vw)]"
      bodyClassName="max-h-[70vh] overflow-hidden"
    >
      <div className="flex flex-col gap-4">
        <div className="flex shrink-0 flex-col gap-3 rounded-box bg-base-200 p-3 sm:flex-row sm:items-center">
          <div className="flex flex-1 flex-wrap gap-3 text-sm">
            <span>共 {stats.total} 个文件</span>
            <span>剩余 {stats.remaining}</span>
            <span>失败 {stats.failed}</span>
          </div>
          <button
            type="button"
            className={`btn btn-outline ${isUploadComplete ? "btn-success" : "btn-error"} btn-sm`}
            onClick={onCancelRemaining}
            disabled={isUploadComplete}
          >
            {isUploadComplete ? "已完成" : "取消全部剩余上传"}
          </button>
        </div>

        <div className="relative min-h-0 max-h-[calc(70vh-7rem)]">
          <div className="max-h-[calc(70vh-7rem)] overflow-y-auto pr-2 [scrollbar-gutter:stable]">
            <ul className="divide-y divide-base-300">
              {visibleItems.map((item) => (
                <UploadItemRow key={item.id} item={item} onCancel={onCancel} onRetry={onRetry} />
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
