import type { DirectoryStatsResponse } from "../../types";
import { formatBytes } from "../utils/fileFormatters";
import { Dialog } from "./Dialog";

interface DirectoryStatsModalProps {
  isOpen: boolean;
  path: string;
  stats: DirectoryStatsResponse | null;
  error: string | null;
  isLoading: boolean;
  onClose: () => void;
}

function getDisplayPath(path: string): string {
  return path ? `/${path}` : "/";
}

export function DirectoryStatsModal({
  isOpen,
  path,
  stats,
  error,
  isLoading,
  onClose,
}: DirectoryStatsModalProps) {
  return (
    <Dialog
      isOpen={isOpen}
      title="目录统计"
      onClose={onClose}
      cancelText="关闭"
      showConfirmButton={false}
      boxClassName="max-w-md bg-base-100 p-5 shadow-sm"
      closeButtonAriaLabel="关闭目录统计弹窗"
      cancelButtonClassName="btn btn-sm btn-primary"
    >
      <>
        <div className="mb-4 text-sm">
          <span className="text-base-content/60">目录：</span>
          <span className="break-all font-mono text-base-content">{getDisplayPath(path)}</span>
        </div>

        {isLoading ? (
          <div className="flex min-h-32 flex-col items-center justify-center gap-3 text-sm text-base-content/60">
            <span className="loading loading-spinner loading-md text-primary" />
            <span>正在统计当前目录下的全部文件...</span>
          </div>
        ) : error ? (
          <div className="rounded-box border border-error/25 bg-error/8 p-4 text-sm">
            <p className="font-medium text-error">加载目录统计失败</p>
            <p className="mt-2 text-base-content/70">{error}</p>
          </div>
        ) : stats ? (
          <ul className="space-y-3">
            <li className="flex items-start gap-1 text-sm">
              <span className="w-20 shrink-0 text-base-content/60">文件总数：</span>
              <span className="font-medium text-base-content">
                {stats.fileCount.toLocaleString()} 个
              </span>
            </li>
            <li className="flex items-start gap-1 text-sm">
              <span className="w-20 shrink-0 text-base-content/60">总大小：</span>
              <span className="font-medium text-base-content">
                {formatBytes(stats.totalBytes)} ({stats.totalBytes.toLocaleString()} 字节)
              </span>
            </li>
          </ul>
        ) : (
          <div className="rounded-box bg-base-200 p-4 text-sm text-base-content/60">
            暂无目录统计数据
          </div>
        )}
      </>
    </Dialog>
  );
}
