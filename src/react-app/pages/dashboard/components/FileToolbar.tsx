import { useCallback, useRef } from "react";
import MdiArrowDown from "~icons/mdi/arrow-down";
import MdiArrowUp from "~icons/mdi/arrow-up";
import MdiClose from "~icons/mdi/close";
import MdiFileUpload from "~icons/mdi/file-upload";
import MdiFilePlus from "~icons/mdi/file-plus";
import MdiFolderPlus from "~icons/mdi/folder-plus";
import MdiFolderUpload from "~icons/mdi/folder-upload";
import MdiMagnify from "~icons/mdi/magnify";
import MdiRefresh from "~icons/mdi/refresh";
import MdiSwapVertical from "~icons/mdi/swap-vertical";
import type { SortKey } from "../../../../types";
import { useAppStore } from "../../../store";
import { takeFileInputSelection } from "../../../utils/uploadInputSelection";
import {
  openNewTextFile,
  setDashboardSearchInput,
  setUploadType,
  startCreateFolder,
  toggleDashboardSort,
} from "../actions";
import { useDashboardFileView } from "../hooks/useDashboardFileView";
import { countUploadQueueStats } from "../hooks/useUploadQueue";
import { uploadDashboardFiles } from "../uploadFiles";
import { FileBreadcrumbs } from "./FileBreadcrumbs";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "uploadedAt", label: "按时间排序" },
  { key: "name", label: "按名称排序" },
  { key: "size", label: "按大小排序" },
];

function SortMenu() {
  const { dashboardSortKey, dashboardSortOrder } = useAppStore();
  const ActiveSortIcon = dashboardSortOrder === "asc" ? MdiArrowUp : MdiArrowDown;
  const activeSortLabel =
    SORT_OPTIONS.find((option) => option.key === dashboardSortKey)?.label ?? "按时间排序";
  const sortOrderLabel = dashboardSortOrder === "asc" ? "升序" : "降序";

  return (
    <div
      className="dropdown dropdown-end tooltip"
      data-tip={`当前排序：${activeSortLabel}（${sortOrderLabel}）`}
    >
      <button
        type="button"
        tabIndex={0}
        className="btn btn-ghost btn-square btn-sm"
        aria-label="排序方式"
      >
        <MdiSwapVertical className="h-5 w-5" />
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu menu-sm bg-base-200 rounded-box z-20 mt-1 w-40 border border-base-300/60 p-2 shadow-lg space-y-1"
      >
        {SORT_OPTIONS.map((option) => {
          const isActive = dashboardSortKey === option.key;
          const SortIcon = isActive ? ActiveSortIcon : MdiSwapVertical;

          return (
            <li key={option.key}>
              <button
                type="button"
                className={`gap-2 ${isActive ? "active font-medium" : ""}`}
                aria-current={isActive ? "true" : undefined}
                aria-label={option.label}
                onClick={() => {
                  (document.activeElement as HTMLElement | null)?.blur();
                  toggleDashboardSort(option.key);
                }}
              >
                <SortIcon className={`h-4 w-4 ${isActive ? "" : "opacity-50"}`} />
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type FileToolbarProps = {
  isCurrentPathMissing?: boolean;
};

export function FileToolbar({ isCurrentPathMissing = false }: FileToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const { getUniqueFolderName, isRefreshing, refresh, searchInputValue } = useDashboardFileView();
  const { creatingFolder, isCreatingNewFolder, renamingPath, savingTextFile, uploadQueue } =
    useAppStore();
  const isSearchExpanded = searchInputValue.length > 0;
  const isUploadingFile = countUploadQueueStats(uploadQueue).active > 0;
  const isFileMutationDisabled = Boolean(renamingPath);
  const uploadFileTooltip = isUploadingFile ? "继续添加上传文件" : "上传文件";
  const newFolderTooltip = creatingFolder ? "Creating..." : "New Folder";

  const folderInputCallbackRef = useCallback((node: HTMLInputElement | null) => {
    folderInputRef.current = node;
    if (node) {
      node.setAttribute("webkitdirectory", "");
      node.setAttribute("directory", "");
    }
  }, []);

  const handleUploadSelection = (
    event: React.ChangeEvent<HTMLInputElement>,
    source: "file" | "folder",
  ) => {
    const files = takeFileInputSelection(event.target);
    void uploadDashboardFiles({ files, source, isFileMutationDisabled });
  };

  const focusSearchInput = () => {
    requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
  };

  const clearSearchInput = () => {
    setDashboardSearchInput("");
    focusSearchInput();
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        onChange={(event) => handleUploadSelection(event, "file")}
      />
      <input
        ref={folderInputCallbackRef}
        type="file"
        className="hidden"
        onChange={(event) => handleUploadSelection(event, "folder")}
      />

      <FileBreadcrumbs isCurrentPathMissing={isCurrentPathMissing} />

      {!isCurrentPathMissing ? (
        <div className="ml-auto flex w-full min-w-0 flex-wrap items-center justify-end gap-3 sm:w-auto sm:flex-1 sm:gap-4">
          <div className="flex items-center gap-2">
            <div className="tooltip" data-tip={uploadFileTooltip}>
              <button
                type="button"
                className="btn btn-square btn-sm border-emerald-500 bg-emerald-500 text-white hover:border-emerald-600 hover:bg-emerald-600 focus-visible:outline-emerald-500 disabled:border-emerald-300 disabled:bg-emerald-300"
                onClick={() => {
                  setUploadType("file");
                  fileInputRef.current?.click();
                }}
                disabled={isFileMutationDisabled}
                aria-label="上传文件"
              >
                <MdiFileUpload className="w-5 h-5" />
              </button>
            </div>
            <div className="tooltip" data-tip="上传文件夹">
              <button
                type="button"
                className="btn btn-square btn-sm border-green-500 bg-green-500 text-white hover:border-green-600 hover:bg-green-600 focus-visible:outline-green-500 disabled:border-green-300 disabled:bg-green-300"
                onClick={() => {
                  setUploadType("folder");
                  folderInputRef.current?.click();
                }}
                disabled={isFileMutationDisabled}
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
              disabled={savingTextFile || isFileMutationDisabled}
              onClick={openNewTextFile}
              aria-label="新建文本文件"
            >
              <MdiFilePlus className="w-5 h-5" />
            </button>
          </div>
          <div className="tooltip" data-tip={newFolderTooltip}>
            <button
              type="button"
              className={`btn btn-secondary btn-square btn-sm ${creatingFolder ? "loading" : ""}`}
              disabled={creatingFolder || isCreatingNewFolder || isFileMutationDisabled}
              onClick={() => startCreateFolder(getUniqueFolderName("新建文件夹"))}
              aria-label="新建文件夹"
            >
              {!creatingFolder && <MdiFolderPlus className="w-5 h-5" />}
            </button>
          </div>
          <SortMenu />
          <div
            className={`group/search relative h-8 max-w-full min-w-0 shrink-0 transition-[width] duration-200 ease-in-out focus-within:order-last focus-within:basis-full focus-within:w-full sm:focus-within:order-none sm:focus-within:basis-auto sm:focus-within:w-40 ${
              isSearchExpanded
                ? "order-last basis-full w-full sm:order-none sm:basis-auto sm:w-40"
                : "basis-8 w-8"
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
                value={searchInputValue}
                onChange={(event) => setDashboardSearchInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setDashboardSearchInput("");
                    event.currentTarget.blur();
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
                onMouseDown={(event) => event.preventDefault()}
                onClick={focusSearchInput}
                aria-label="搜索文件"
              >
                <MdiMagnify className="w-5 h-5" />
              </button>
            </div>
            {isSearchExpanded && (
              <button
                type="button"
                className="btn btn-ghost btn-square btn-xs absolute inset-y-0 right-1 z-10 my-auto h-6 min-h-6 w-6 text-base-content/50 hover:text-base-content"
                onMouseDown={(event) => event.preventDefault()}
                onClick={clearSearchInput}
                aria-label="清空搜索"
              >
                <MdiClose className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="tooltip shrink-0" data-tip="Refresh">
            <button
              type="button"
              className={`btn btn-ghost btn-square btn-sm ${isRefreshing ? "loading w-8 scale-75" : ""}`}
              disabled={isRefreshing}
              onClick={() => void refresh()}
              aria-label="刷新文件列表"
            >
              {!isRefreshing && <MdiRefresh className="w-5 h-5" />}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
