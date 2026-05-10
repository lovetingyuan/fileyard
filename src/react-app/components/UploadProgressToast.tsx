interface UploadProgressToastProps {
  fileName: string;
  onCancel: () => void;
  progress: number;
}

export function UploadProgressToast({ fileName, onCancel, progress }: UploadProgressToastProps) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="w-[min(20rem,calc(100vw-2rem))] rounded-box border border-base-300 bg-base-100 p-3 text-base-content shadow-lg">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium" title={fileName}>
              {fileName}
            </p>
            <span className="shrink-0 text-xs font-medium tabular-nums">{safeProgress}%</span>
          </div>
          <progress
            className="progress progress-primary mt-2 h-2 w-full"
            max={100}
            value={safeProgress}
            role="progressbar"
            aria-label={`${fileName} upload progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={safeProgress}
          />
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-xs shrink-0 text-error"
          aria-label={`取消上传 ${fileName}`}
          onClick={onCancel}
        >
          取消
        </button>
      </div>
    </div>
  );
}
