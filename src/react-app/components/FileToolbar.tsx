import { useRef } from "react";
import MdiFileUpload from "~icons/mdi/file-upload";
import MdiFilePlus from "~icons/mdi/file-plus";
import MdiFolderPlus from "~icons/mdi/folder-plus";
import MdiFolderUpload from "~icons/mdi/folder-upload";
import MdiHomeOutline from "~icons/mdi/home-outline";
import MdiMagnify from "~icons/mdi/magnify";
import MdiRefresh from "~icons/mdi/refresh";
import { formatBytes } from "../utils/fileFormatters";

interface FileToolbarProps {
  breadcrumbs: string[];
  fileCount: number;
  totalBytes: number;
  isUploadDisabled: boolean;
  isCreateTextFileDisabled: boolean;
  isCreateFolderDisabled: boolean;
  isRefreshDisabled: boolean;
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
}

export function FileToolbar({
  breadcrumbs,
  fileCount,
  totalBytes,
  isUploadDisabled,
  isCreateTextFileDisabled,
  isCreateFolderDisabled,
  isRefreshDisabled,
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
}: FileToolbarProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchExpanded = searchQuery.length > 0;
  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
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

      <div className="ml-auto flex w-full min-w-0 flex-wrap items-center justify-end gap-3 sm:w-auto sm:flex-1 sm:gap-4">
        <button
          type="button"
          className="link link-hover mr-auto text-xs text-base-content/60 whitespace-nowrap sm:mr-0"
          onClick={onShowDirectoryStats}
        >
          {fileCount} files, {formatBytes(totalBytes)}
        </button>
        <div className="flex items-center gap-2">
          <div className="tooltip" data-tip={isUploadingFile ? "继续添加上传文件" : "上传文件"}>
            <button
              type="button"
              className="btn btn-square btn-sm border-emerald-500 bg-emerald-500 text-white hover:border-emerald-600 hover:bg-emerald-600 focus-visible:outline-emerald-500 disabled:border-emerald-300 disabled:bg-emerald-300"
              disabled={isUploadDisabled}
              onClick={onUploadClick}
              aria-label="上传文件"
            >
              <MdiFileUpload className="w-5 h-5" />
            </button>
          </div>
          <div className="tooltip" data-tip="上传文件夹">
            <button
              type="button"
              className="btn btn-square btn-sm border-green-500 bg-green-500 text-white hover:border-green-600 hover:bg-green-600 focus-visible:outline-green-500 disabled:border-green-300 disabled:bg-green-300"
              disabled={isUploadDisabled}
              onClick={onUploadFolderClick}
              aria-label="上传文件夹"
            >
              <MdiFolderUpload className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="tooltip" data-tip="New Text File">
          <button
            type="button"
            className="btn btn-accent btn-square btn-sm"
            disabled={isCreateTextFileDisabled}
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
            disabled={isCreateFolderDisabled || isCreatingNewFolder}
            onClick={onCreateFolder}
            aria-label="新建文件夹"
          >
            {!isCreatingFolder && <MdiFolderPlus className="w-5 h-5" />}
          </button>
        </div>
        <div
          className={`group/search-actions flex h-8 min-w-0 shrink-0 items-center gap-3 focus-within:order-last focus-within:basis-full focus-within:w-full sm:focus-within:order-none sm:focus-within:basis-auto sm:focus-within:w-auto ${
            isSearchExpanded
              ? "order-last basis-full w-full sm:order-none sm:basis-auto sm:w-auto"
              : "basis-auto w-auto"
          }`}
        >
          <div
            className={`group/search relative h-8 max-w-full min-w-0 shrink-0 transition-[width] duration-200 ease-in-out group-focus-within/search-actions:flex-1 sm:group-focus-within/search-actions:flex-none sm:group-focus-within/search-actions:w-40 ${
              isSearchExpanded ? "flex-1 sm:flex-none sm:w-40" : "basis-8 w-8"
            }`}
          >
            <div className="absolute inset-0 overflow-hidden rounded-field">
              <input
                ref={searchInputRef}
                type="text"
                className={`placeholder:text-[12px] input input-sm input-bordered absolute top-0 right-0 h-8 w-full min-w-0 transition-opacity duration-150 ease-in-out sm:w-40 group-focus-within/search:border-base-300 group-focus-within/search:bg-base-100 group-focus-within/search:opacity-100 group-focus-within/search:outline-none ${
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
          <div className="tooltip shrink-0" data-tip="Refresh">
            <button
              type="button"
              className={`btn btn-ghost btn-square btn-sm ${isRefreshing ? "loading w-8 scale-75" : ""}`}
              disabled={isRefreshDisabled}
              onClick={onRefresh}
              aria-label="刷新文件列表"
            >
              {!isRefreshing && <MdiRefresh className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
