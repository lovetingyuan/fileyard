import { Icon } from "@iconify/react";
import type { SortKey, SortOrder } from "../../types";
import { formatBytes } from "../utils/fileFormatters";

type SortValue = `${SortKey}:${SortOrder}`;

interface FileToolbarProps {
  currentPath: string;
  breadcrumbs: string[];
  fileCount: number;
  totalBytes: number;
  busy: boolean;
  isUploadingFile: boolean;
  isCreatingFolder: boolean;
  isRefreshing: boolean;
  isCreatingNewFolder: boolean;
  sort: SortKey;
  order: SortOrder;
  onSetPath: (path: string) => void;
  onUploadClick: () => void;
  onCreateFolder: () => void;
  onCreateTextFile: () => void;
  onRefresh: () => void;
  onSortChange: (sort: SortKey, order: SortOrder) => void;
}

export function FileToolbar({
  breadcrumbs,
  fileCount,
  totalBytes,
  busy,
  isUploadingFile,
  isCreatingFolder,
  isRefreshing,
  isCreatingNewFolder,
  sort,
  order,
  onSetPath,
  onUploadClick,
  onCreateFolder,
  onCreateTextFile,
  onRefresh,
  onSortChange,
}: FileToolbarProps) {
  const sortValue: SortValue = `${sort}:${order}`;

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const [s, o] = e.target.value.split(":") as [SortKey, SortOrder];
    onSortChange(s, o);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="max-w-full shrink-0 overflow-x-auto breadcrumbs text-sm">
        <ul>
          <li>
            <button
              type="button"
              className="link link-hover inline-flex items-center gap-1"
              onClick={() => onSetPath("")}
            >
              <Icon icon="mdi:home-outline" className="w-4 h-4" />
              Home
            </button>
          </li>
          {breadcrumbs.map((segment, index) => {
            const path = breadcrumbs.slice(0, index + 1).join("/");
            return (
              <li key={path}>
                <button type="button" className="link link-hover" onClick={() => onSetPath(path)}>
                  {segment}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3 sm:gap-4">
        <span className="text-xs text-base-content/60 whitespace-nowrap">
          {fileCount} 个文件，共 {formatBytes(totalBytes)}
        </span>
        <div className="tooltip" data-tip={isUploadingFile ? "Uploading..." : "Upload File"}>
          <button
            type="button"
            className={`btn btn-primary btn-square btn-sm ${isUploadingFile ? "loading" : ""}`}
            disabled={busy}
            onClick={onUploadClick}
          >
            {!isUploadingFile && <Icon icon="mdi:upload" className="w-5 h-5" />}
          </button>
        </div>
        <div className="tooltip" data-tip="New Text File">
          <button
            type="button"
            className="btn btn-accent btn-square btn-sm"
            disabled={busy}
            onClick={onCreateTextFile}
          >
            <Icon icon="mdi:file-plus" className="w-5 h-5" />
          </button>
        </div>
        <div className="tooltip" data-tip={isCreatingFolder ? "Creating..." : "New Folder"}>
          <button
            type="button"
            className={`btn btn-secondary btn-square btn-sm ${isCreatingFolder ? "loading" : ""}`}
            disabled={busy || isCreatingNewFolder}
            onClick={onCreateFolder}
          >
            {!isCreatingFolder && <Icon icon="mdi:folder-plus" className="w-5 h-5" />}
          </button>
        </div>
        <select
          className="select select-bordered select-sm"
          value={sortValue}
          onChange={handleSortChange}
          disabled={busy}
        >
          <option value="uploadedAt:desc">上传时间（最新）</option>
          <option value="uploadedAt:asc">上传时间（最旧）</option>
          <option value="name:asc">文件名（A→Z）</option>
          <option value="name:desc">文件名（Z→A）</option>
          <option value="size:desc">文件大小（最大）</option>
          <option value="size:asc">文件大小（最小）</option>
        </select>
        <div className="tooltip" data-tip="Refresh">
          <button
            type="button"
            className={`btn btn-outline btn-square btn-sm ${isRefreshing ? "loading" : ""}`}
            disabled={busy}
            onClick={onRefresh}
          >
            {!isRefreshing && <Icon icon="mdi:refresh" className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
