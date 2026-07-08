import MdiCloseCircleOutline from "~icons/mdi/close-circle-outline";
import MdiFolderUpload from "~icons/mdi/folder-upload";
import type { UploadQueueStatus } from "../../../../types";
import { cn } from "../../../utils/cn";
import { formatBytes } from "../../../utils/fileFormatters";
import { cancelDashboardUploadsInFolderAndWait } from "../hooks/useUploadQueue";
import type { UploadFolderProgressDisplayRow } from "./uploadProgressDisplay";
import {
  getUploadProgressRowBackgroundStyle,
  UPLOAD_PROGRESS_ROW_CLASS_NAME,
} from "./uploadProgressRowStyle";

interface UploadFolderProgressRowProps {
  row: UploadFolderProgressDisplayRow;
}

function getFolderStatusLabel(row: UploadFolderProgressDisplayRow): string {
  const segments: string[] = [];
  if (row.failed > 0) {
    segments.push(`${row.failed} 个失败`);
  }
  if (row.canceled > 0) {
    segments.push(`${row.canceled} 个已取消`);
  }
  return segments.join(" · ");
}

function getFolderProgressStatus(row: UploadFolderProgressDisplayRow): UploadQueueStatus {
  if (row.remaining > 0) {
    return "uploading";
  }
  if (row.failed > 0) {
    return "failed";
  }
  if (row.canceled > 0) {
    return "canceled";
  }
  return "success";
}

function getFolderStatusBadge(row: UploadFolderProgressDisplayRow): {
  className: string;
  text: string;
} {
  if (row.remaining > 0) {
    return {
      className: "badge-info",
      text: "上传中",
    };
  }
  if (row.failed > 0 || row.canceled > 0) {
    return {
      className: "badge-warning",
      text: "上传已结束",
    };
  }
  return {
    className: "badge-success",
    text: "上传完成",
  };
}

export function UploadFolderProgressRow({ row }: UploadFolderProgressRowProps) {
  const progress = Math.max(0, Math.min(100, Math.round(row.progress)));
  const statusBadge = getFolderStatusBadge(row);
  const statusLabel = getFolderStatusLabel(row);

  return (
    <li
      className={UPLOAD_PROGRESS_ROW_CLASS_NAME}
      style={getUploadProgressRowBackgroundStyle(progress, getFolderProgressStatus(row))}
    >
      <div className="flex min-w-0 items-center gap-2">
        <MdiFolderUpload className="h-4 w-4 shrink-0 text-info" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium" title={row.displayPath}>
              {row.displayPath}
            </p>
            <span className="shrink-0 text-xs text-base-content/60">
              {row.fileCount} 个文件 · {formatBytes(row.size)}
            </span>
          </div>
          {statusLabel ? (
            <p className="mt-0.5 truncate text-xs text-base-content/60" title={statusLabel}>
              {statusLabel}
            </p>
          ) : null}
        </div>
        <span className={cn("badge badge-xs shrink-0", statusBadge.className)}>
          {statusBadge.text}
        </span>
        <span className="shrink-0 text-xs font-medium tabular-nums">{progress}%</span>
        {row.canCancel ? (
          <div className="tooltip tooltip-left shrink-0" data-tip="取消">
            <button
              type="button"
              className="btn btn-ghost btn-xs btn-square text-error"
              onClick={() => void cancelDashboardUploadsInFolderAndWait(row.folderPath)}
              aria-label={`取消上传 ${row.displayPath}`}
            >
              <MdiCloseCircleOutline className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
