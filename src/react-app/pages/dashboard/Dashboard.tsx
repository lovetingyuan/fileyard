import { useRef, useState } from "react";
import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import MdiFolderOpenOutline from "~icons/mdi/folder-open-outline";
import MdiMagnifyRemoveOutline from "~icons/mdi/magnify-remove-outline";
import toast from "react-hot-toast";
import { useUploadUnloadProtection } from "../../hooks/useUploadUnloadProtection";
import { useAppStore } from "../../store";
import { getDroppedUploadFiles } from "../../utils/uploadDrop";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { DirectoryStatsModal } from "./components/DirectoryStatsModal";
import { FileDetailsModal } from "./components/FileDetailsModal";
import { FileRow, FolderRow } from "./components/FileTableRows";
import { FileToolbar } from "./components/FileToolbar";
import { NewFolderModal } from "./components/NewFolderModal";
import { NewTextFileModal } from "./components/NewTextFileModal";
import { PreviewModal } from "./components/PreviewModal";
import { RenameModal } from "./components/RenameModal";
import { ShareFileModal } from "./components/ShareFileModal";
import { UploadProgressPanel } from "./components/UploadProgressPanel";
import { useDashboardFileView } from "./hooks/useDashboardFileView";
import { useUploadQueue } from "./hooks/useUploadQueue";
import { uploadDashboardFiles } from "./uploadFiles";

export function Dashboard() {
  const {
    currentFile,
    isCreatingNewFolder,
    addNewFolderName,
    pendingRenameTarget,
    renamingPath,
    savingTextFile,
    sharing,
  } = useAppStore();
  const {
    currentPath,
    error,
    filteredFiles,
    filteredFolders,
    isLoading,
    refresh,
    searchInputValue,
  } = useDashboardFileView();
  const uploadQueue = useUploadQueue({
    currentPath,
    onUploadsComplete: refresh,
  });
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const dragDepthRef = useRef(0);
  const isFileUploadInProgress = savingTextFile || uploadQueue.isUploading;
  const isFileMutationDisabled = Boolean(renamingPath);
  const EmptyStateIcon = searchInputValue ? MdiMagnifyRemoveOutline : MdiFolderOpenOutline;

  useUploadUnloadProtection(isFileUploadInProgress);

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingUpload(true);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isFileMutationDisabled ? "none" : "copy";
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDraggingUpload(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDraggingUpload(false);

    void (async () => {
      try {
        const { files, source } = await getDroppedUploadFiles(event.dataTransfer);
        await uploadDashboardFiles({ files, source, isFileMutationDisabled });
      } catch {
        toast.error("Failed to read dropped files");
      }
    })();
  };

  return (
    <div className="flex flex-1 flex-col">
      <DeleteConfirmModal />
      <DirectoryStatsModal />
      <FileDetailsModal />
      {pendingRenameTarget ? <RenameModal key={pendingRenameTarget.path} /> : null}
      {sharing && currentFile ? <ShareFileModal key={currentFile.path} /> : null}
      <PreviewModal />
      {isCreatingNewFolder ? <NewFolderModal key={addNewFolderName} /> : null}
      <NewTextFileModal />
      <UploadProgressPanel />
      <main className="mx-auto flex w-[96%] max-w-300 flex-1 flex-col gap-4 py-6 md:w-[90%]">
        <section className="card bg-base-100 shadow-sm">
          <div
            className={`card-body gap-4 rounded-box border border-transparent transition-colors duration-150 ${
              isDraggingUpload ? "border-primary bg-primary/30 ring-2 ring-primary/40" : ""
            }`}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
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
                        <span>Name</span>
                      </th>
                      <th className="hidden sm:table-cell sm:w-28">
                        <span>Size</span>
                      </th>
                      <th className="hidden sm:table-cell sm:w-46">
                        <span>Updated</span>
                      </th>
                      <th className="w-18 text-right sm:w-21">
                        <span>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
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
