import { useRef } from "react";
import MdiChevronDown from "~icons/mdi/chevron-down";
import MdiFileUpload from "~icons/mdi/file-upload";
import MdiFilePlus from "~icons/mdi/file-plus";
import MdiFolderPlus from "~icons/mdi/folder-plus";
import MdiFolderUpload from "~icons/mdi/folder-upload";
import MdiHomeOutline from "~icons/mdi/home-outline";
import MdiMagnify from "~icons/mdi/magnify";
import MdiRefresh from "~icons/mdi/refresh";
import MdiUpload from "~icons/mdi/upload";
import { formatBytes } from "../utils/fileFormatters";

interface FileToolbarProps {
  breadcrumbs: string[];
  fileCount: number;
  totalBytes: number;
  busy: boolean;
  isUploadingFile: boolean;
  isCreatingFolder: boolean;
  isRefreshing: boolean;
  isCreatingNewFolder: boolean;
  searchQuery: string;
  isSearchPending: boolean;
  onSetPath: (path: string) => void;
  onUploadClick: () => void;
  onUploadFolderClick: () => void;
  onCreateFolder: () => void;
  onCreateTextFile: () => void;
  onRefresh: () => void;
  onSearchChange: (q: string) => void;
  onShowDirectoryStats: () => void;
  uploadStatusText: string | null;
  onShowUploadDetails: () => void;
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
  searchQuery,
  isSearchPending,
  onSetPath,
  onUploadClick,
  onUploadFolderClick,
  onCreateFolder,
  onCreateTextFile,
  onRefresh,
  onSearchChange,
  onShowDirectoryStats,
  uploadStatusText,
  onShowUploadDetails,
}: FileToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchExpanded = searchQuery.length > 0;
  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
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
              <MdiHomeOutline className="w-5 h-5" />
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
        <button
          type="button"
          className="link link-hover text-xs text-base-content/60 whitespace-nowrap"
          onClick={onShowDirectoryStats}
        >
          {fileCount} files, {formatBytes(totalBytes)}
        </button>
        <div className="flex items-center gap-2">
          <div className="dropdown dropdown-end">
            <div className="join">
              <div className="tooltip" data-tip={isUploadingFile ? "Uploading..." : "Upload File"}>
                <button
                  type="button"
                  className={`btn btn-primary btn-square btn-sm join-item ${
                    isUploadingFile ? "loading" : ""
                  }`}
                  disabled={busy}
                  onClick={onUploadClick}
                  aria-label="上传文件"
                >
                  {!isUploadingFile && <MdiUpload className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                tabIndex={busy ? -1 : 0}
                className="btn btn-primary btn-square btn-sm join-item"
                disabled={busy}
                aria-label="选择上传类型"
              >
                <MdiChevronDown className="h-4 w-4" />
              </button>
            </div>
            <ul
              tabIndex={0}
              className="menu dropdown-content z-20 mt-2 w-40 rounded-box border border-base-300 bg-base-100 p-2 text-sm shadow"
            >
              <li>
                <button type="button" disabled={busy} onClick={onUploadClick}>
                  <MdiFileUpload className="h-4 w-4" />
                  上传文件
                </button>
              </li>
              <li>
                <button type="button" disabled={busy} onClick={onUploadFolderClick}>
                  <MdiFolderUpload className="h-4 w-4" />
                  上传文件夹
                </button>
              </li>
            </ul>
          </div>
          {uploadStatusText ? (
            <button
              type="button"
              className="link link-hover max-w-36 truncate text-left text-xs text-primary sm:max-w-none"
              onClick={onShowUploadDetails}
              title={uploadStatusText}
            >
              {uploadStatusText}
            </button>
          ) : null}
        </div>
        <div className="tooltip" data-tip="New Text File">
          <button
            type="button"
            className="btn btn-accent btn-square btn-sm"
            disabled={busy}
            onClick={onCreateTextFile}
            aria-label="新建文本文件"
          >
            <MdiFilePlus className="w-5 h-5" />
          </button>
        </div>
        <div className="tooltip" data-tip={isCreatingFolder ? "Creating..." : "New Folder"}>
          <button
            type="button"
            className={`btn btn-secondary btn-square btn-sm ${isCreatingFolder ? "loading" : ""}`}
            disabled={busy || isCreatingNewFolder}
            onClick={onCreateFolder}
            aria-label="新建文件夹"
          >
            {!isCreatingFolder && <MdiFolderPlus className="w-5 h-5" />}
          </button>
        </div>
        <div
          className={`group/search relative h-8 shrink-0 transition-[width] duration-200 ease-in-out focus-within:w-40 ${
            isSearchExpanded ? "w-40" : "w-8"
          }`}
        >
          <div className="absolute inset-0 overflow-hidden rounded-field">
            <input
              ref={searchInputRef}
              type="text"
              className={`placeholder:text-[12px] input input-sm input-bordered absolute top-0 right-0 h-8 w-40 min-w-0 transition-opacity duration-150 ease-in-out group-focus-within/search:border-base-300 group-focus-within/search:bg-base-100 group-focus-within/search:opacity-100 group-focus-within/search:outline-none ${
                isSearchExpanded
                  ? "border-base-300 bg-base-100 pr-9 opacity-100"
                  : "border-transparent bg-transparent pr-9 opacity-0"
              }`}
              placeholder="Search current folder"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onSearchChange("");
                  e.currentTarget.blur();
                }
              }}
            />
          </div>
          <div className="pointer-events-none absolute inset-0 rounded-field transition-shadow duration-150 ease-in-out group-focus-within/search:ring-2 group-focus-within/search:ring-base-content/15" />
          <div className="tooltip absolute inset-y-0 right-0 z-10" data-tip="Search">
            <button
              type="button"
              className={`btn btn-ghost btn-square btn-sm h-8 w-8 transition-opacity duration-150 ease-in-out group-focus-within/search:pointer-events-none group-focus-within/search:opacity-0 ${
                isSearchExpanded ? "pointer-events-none opacity-0" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={focusSearchInput}
              aria-label="搜索文件"
            >
              <MdiMagnify className="w-5 h-5" />
            </button>
          </div>
          {isSearchExpanded && (
            <div className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-base-content/40">
              {isSearchPending ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <MdiMagnify className="h-4 w-4" />
              )}
            </div>
          )}
        </div>
        <div className="tooltip" data-tip="Refresh">
          <button
            type="button"
            className={`btn btn-ghost btn-square btn-sm ${isRefreshing ? "loading w-8 scale-75" : ""}`}
            disabled={busy}
            onClick={onRefresh}
            aria-label="刷新文件列表"
          >
            {!isRefreshing && <MdiRefresh className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
