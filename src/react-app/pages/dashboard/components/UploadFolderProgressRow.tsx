import MdiCloseCircleOutline from "~icons/mdi/close-circle-outline";
import MdiFolderUpload from "~icons/mdi/folder-upload";
import { formatBytes } from "../../../utils/fileFormatters";
import { cancelDashboardUploadsInFolderAndWait } from "../hooks/useUploadQueue";
import type { UploadFolderProgressDisplayRow } from "./uploadProgressDisplay";

interface UploadFolderProgressRowProps {
  row: UploadFolderProgressDisplayRow;
}

function getFolderStatusLabel(row: UploadFolderProgressDisplayRow): string {
  const segments: string[] = [];
  if (row.remaining > 0) {
    segments.push(`${row.remaining} 个进行中`);
  }
  if (row.failed > 0) {
    segments.push(`${row.failed} 个失败`);
  }
  if (row.canceled > 0) {
    segments.push(`${row.canceled} 个已取消`);
  }
  return segments.join(" · ");
}

function getFolderStatusBadge(row: UploadFolderProgressDisplayRow): {
  className: string;
  text: string;
} {
  if (row.remaining > 0) {
    return {
      className: "border-cyan-200 bg-cyan-100 text-cyan-800",
      text: "上传中",
    };
  }
  if (row.failed > 0 || row.canceled > 0) {
    return {
      className: "border-amber-200 bg-amber-100 text-amber-800",
      text: "上传已结束",
    };
  }
  return {
    className: "border-emerald-200 bg-emerald-100 text-emerald-700",
    text: "上传完成",
  };
}

export function UploadFolderProgressRow({ row }: UploadFolderProgressRowProps) {
  const progress = Math.max(0, Math.min(100, Math.round(row.progress)));
  const statusBadge = getFolderStatusBadge(row);
  const statusLabel = getFolderStatusLabel(row);

  return (
    <li className="rounded-box bg-base-200/70 px-3 py-2">
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
        <span className={`badge badge-xs shrink-0 ${statusBadge.className}`}>
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
