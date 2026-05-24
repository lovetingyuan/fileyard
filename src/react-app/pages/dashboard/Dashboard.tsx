import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import MdiArrowDown from "~icons/mdi/arrow-down";
import MdiArrowUp from "~icons/mdi/arrow-up";
import MdiFolderOpenOutline from "~icons/mdi/folder-open-outline";
import MdiMagnifyRemoveOutline from "~icons/mdi/magnify-remove-outline";
import MdiSwapVertical from "~icons/mdi/swap-vertical";
import type { SortKey } from "../../../types";
import { useUploadUnloadProtection } from "../../hooks/useUploadUnloadProtection";
import { useAppStore } from "../../store";
import { toggleDashboardSort } from "./actions";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { DirectoryStatsModal } from "./components/DirectoryStatsModal";
import { FileDetailsModal } from "./components/FileDetailsModal";
import { FileRow, FolderRow, NewFolderRow } from "./components/FileTableRows";
import { FileToolbar } from "./components/FileToolbar";
import { NewTextFileModal } from "./components/NewTextFileModal";
import { PreviewModal } from "./components/PreviewModal";
import { ShareFileModal } from "./components/ShareFileModal";
import { UploadProgressPanel } from "./components/UploadProgressPanel";
import { useDashboardFileView } from "./hooks/useDashboardFileView";
import { useUploadQueue } from "./hooks/useUploadQueue";

function SortButton({ isActive, sortKey }: { isActive: boolean; sortKey: SortKey }) {
  const { dashboardSortOrder } = useAppStore();
  const ActiveSortIcon = dashboardSortOrder === "asc" ? MdiArrowUp : MdiArrowDown;
  const SortIcon = isActive ? ActiveSortIcon : MdiSwapVertical;

  return (
    <button
      type="button"
      className="btn btn-ghost btn-xs btn-square"
      onClick={() => toggleDashboardSort(sortKey)}
    >
      <SortIcon className={`w-3.5 h-3.5 ${isActive ? "text-primary" : "opacity-60"}`} />
    </button>
  );
}

export function Dashboard() {
  const { currentFile, isCreatingNewFolder, savingTextFile, sharing } = useAppStore();
  const {
    currentPath,
    dashboardSortKey,
    error,
    filteredFiles,
    filteredFolders,
    hasItems,
    isLoading,
    refresh,
    searchInputValue,
  } = useDashboardFileView();
  const uploadQueue = useUploadQueue({
    currentPath,
    onUploadsComplete: refresh,
  });
  const isFileUploadInProgress = savingTextFile || uploadQueue.isUploading;
  const EmptyStateIcon = searchInputValue ? MdiMagnifyRemoveOutline : MdiFolderOpenOutline;

  useUploadUnloadProtection(isFileUploadInProgress);

  return (
    <div className="flex flex-1 flex-col">
      <DeleteConfirmModal />
      <DirectoryStatsModal />
      <FileDetailsModal />
      {sharing && currentFile ? <ShareFileModal key={currentFile.path} /> : null}
      <PreviewModal />
      <NewTextFileModal />
      <UploadProgressPanel />
      <main className="mx-auto flex w-[96%] max-w-300 flex-1 flex-col gap-4 py-6 md:w-[90%]">
        <section className="card bg-base-100 shadow-sm">
          <div className="card-body gap-4">
            <FileToolbar />

            {error ? (
              <div className="rounded-box border border-base-300 bg-base-200 p-10">
                <div className="flex flex-col items-center gap-3 text-center text-base-content/60">
                  <MdiAlertCircleOutline className="h-12 w-12 text-error" />
                  <p className="text-sm">Failed to load files</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : (
              <div>
                <table className="table table-zebra table-md table-fixed w-full [&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4">
                  <thead className="bg-base-300">
                    <tr className="bg-base-200">
                      <th className="w-auto">
                        <span className="inline-flex items-center gap-1">
                          Name
                          {hasItems && (
                            <SortButton isActive={dashboardSortKey === "name"} sortKey="name" />
                          )}
                        </span>
                      </th>
                      <th className="hidden sm:table-cell sm:w-28">
                        <span className="inline-flex items-center gap-1">
                          Size
                          {hasItems && (
                            <SortButton isActive={dashboardSortKey === "size"} sortKey="size" />
                          )}
                        </span>
                      </th>
                      <th className="hidden sm:table-cell sm:w-46">
                        <span className="inline-flex items-center gap-1">
                          Updated
                          {hasItems && (
                            <SortButton
                              isActive={dashboardSortKey === "uploadedAt"}
                              sortKey="uploadedAt"
                            />
                          )}
                        </span>
                      </th>
                      <th className="w-18 text-right sm:w-21">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isCreatingNewFolder && <NewFolderRow />}
                    {filteredFolders.map((folder) => (
                      <FolderRow key={`folder:${folder.path}`} folder={folder} />
                    ))}
                    {filteredFiles.map((file) => (
                      <FileRow key={`file:${file.path}`} file={file} />
                    ))}
                    {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                      <>
                        <tr className={searchInputValue ? "sm:hidden" : "bg-base-100 sm:hidden"}>
                          <td colSpan={2}>
                            <div className="flex flex-col items-center gap-2 py-15 text-base-content/60">
                              <EmptyStateIcon className="w-12 h-12" />
                              {searchInputValue
                                ? `No results for "${searchInputValue}"`
                                : "This folder is empty."}
                            </div>
                          </td>
                        </tr>
                        <tr
                          className={
                            searchInputValue ? "hidden sm:table-row" : "hidden bg-base-100 sm:table-row"
                          }
                        >
                          <td colSpan={4}>
                            <div className="flex flex-col items-center gap-2 py-15 text-base-content/60">
                              <EmptyStateIcon className="w-12 h-12" />
                              {searchInputValue
                                ? `No results for "${searchInputValue}"`
                                : "This folder is empty."}
                            </div>
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
