import type { DirectoryStatsResponse } from "../../types";
import { formatBytes } from "../utils/fileFormatters";
import { Dialog } from "./Dialog";
import { DetailsList } from "./DetailsList";

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

function getFolderName(path: string): string {
  if (!path) {
    return "根目录";
  }

  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

export function DirectoryStatsModal({
  isOpen,
  path,
  stats,
  error,
  isLoading,
  onClose,
}: DirectoryStatsModalProps) {
  const detailItems = [
    {
      label: "名称",
      value: getFolderName(path),
    },
    {
      label: "路径",
      value: getDisplayPath(path),
      valueClassName: "break-all font-mono text-xs sm:text-sm",
    },
    ...(isLoading
      ? [
          {
            label: "状态",
            value: (
              <span className="inline-flex items-center gap-2 text-base-content/70">
                <span className="loading loading-spinner loading-xs text-primary" />
                正在统计当前目录下的全部文件...
              </span>
            ),
          },
        ]
      : error
        ? [
            {
              label: "状态",
              value: "加载目录统计失败",
              valueClassName: "text-error",
            },
            {
              label: "原因",
              value: error,
              valueClassName: "text-base-content/70",
            },
          ]
        : stats
          ? [
              {
                label: "文件数",
                value: `${stats.fileCount.toLocaleString()} 个`,
              },
              {
                label: "总大小",
                value: `${formatBytes(stats.totalBytes)} (${stats.totalBytes.toLocaleString()} 字节)`,
              },
            ]
          : [
              {
                label: "状态",
                value: "暂无目录统计数据",
                valueClassName: "text-base-content/60",
              },
            ]),
  ];

  return (
    <Dialog
      isOpen={isOpen}
      title="文件夹详情"
      onClose={onClose}
      cancelText="关闭"
      showConfirmButton={false}
      boxClassName="max-w-md bg-base-100 p-5 shadow-sm"
      closeButtonAriaLabel="关闭文件夹详情弹窗"
      cancelButtonClassName="btn btn-sm btn-primary"
    >
      <DetailsList items={detailItems} labelWidthClassName="w-16 sm:w-20" />
    </Dialog>
  );
}
