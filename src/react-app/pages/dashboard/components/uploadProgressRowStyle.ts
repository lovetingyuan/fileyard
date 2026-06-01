import type { CSSProperties } from "react";
import type { UploadQueueStatus } from "../../../../types";

export type UploadProgressRowBackgroundStyle = CSSProperties & {
  "--upload-row-progress": string;
  "--upload-row-progress-color": string;
};

const STATUS_PROGRESS_BACKGROUND_COLORS: Record<UploadQueueStatus, string> = {
  queued: "color-mix(in oklab, var(--color-base-content) 10%, transparent)",
  preparing: "color-mix(in oklab, var(--color-info) 10%, transparent)",
  uploading: "color-mix(in oklab, var(--color-success) 50%, transparent)",
  success: "color-mix(in oklab, var(--color-success) 15%, transparent)",
  failed: "color-mix(in oklab, var(--color-error) 15%, transparent)",
  canceled: "color-mix(in oklab, var(--color-base-content) 10%, transparent)",
  oversized: "color-mix(in oklab, var(--color-warning) 20%, transparent)",
  duplicate: "color-mix(in oklab, oklch(54.1% 0.281 293.009) 15%, transparent)",
};

export function getUploadProgressRowBackgroundStyle(
  progress: number,
  status: UploadQueueStatus,
): UploadProgressRowBackgroundStyle {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));
  return {
    "--upload-row-progress": `${safeProgress}%`,
    "--upload-row-progress-color": STATUS_PROGRESS_BACKGROUND_COLORS[status],
  };
}
