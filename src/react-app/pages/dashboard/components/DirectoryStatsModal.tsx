import { Dialog } from "../../../components/Dialog";
import { DetailsList } from "../../../components/DetailsList";
import { useDirectoryStats } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { formatBytes } from "../../../utils/fileFormatters";
import { closeDirectoryStats } from "../actions";

export function DirectoryStatsModal() {
  const {
    directoryStatsPath,
    hideProtectedDirectoryStatsMetrics,
    isDirectoryStatsModalOpen,
  } = useAppStore();
  const { error, isLoading, stats } = useDirectoryStats(
    directoryStatsPath,
    isDirectoryStatsModalOpen && !hideProtectedDirectoryStatsMetrics,
  );

  const pathSegments = directoryStatsPath.split("/").filter(Boolean);
  const folderName = directoryStatsPath
    ? (pathSegments[pathSegments.length - 1] ?? directoryStatsPath)
    : "根目录";
  const displayPath = directoryStatsPath ? `/${directoryStatsPath}` : "/";
  const detailItems = [
    {
      label: "名称",
      value: folderName,
    },
    {
      label: "路径",
      value: displayPath,
      valueClassName: "break-all font-mono text-xs sm:text-sm",
    },
    ...(hideProtectedDirectoryStatsMetrics
      ? []
      : isLoading
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
              value: error.message,
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
                value: `${formatBytes(stats.totalBytes)}`,
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
      isOpen={isDirectoryStatsModalOpen}
      title="文件夹详情"
      onClose={closeDirectoryStats}
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
