import { useEffect, useEffectEvent, useRef, useState } from "react";
import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import toast from "react-hot-toast";
import { useUploadUnloadProtection } from "../../hooks/useUploadUnloadProtection";
import { useAppStore } from "../../store";
import { cn } from "../../utils/cn";
import { getDroppedUploadFiles } from "../../utils/uploadDrop";
import { DashboardFileList } from "./components/DashboardFileList";
import { BatchDeleteConfirmModal } from "./components/BatchDeleteConfirmModal";
import { BatchMoveModal } from "./components/BatchMoveModal";
import { DeleteConfirmModal } from "./components/DeleteConfirmModal";
import { DirectoryStatsModal } from "./components/DirectoryStatsModal";
import { FileDetailsModal } from "./components/FileDetailsModal";
import { FileTreeSidebar } from "./components/FileTreeSidebar";
import { FileToolbar, type FileToolbarHandle } from "./components/FileToolbar";
import { FolderPasswordModal } from "./components/FolderPasswordModal";
import { MoveModal } from "./components/MoveModal";
import { NewFolderModal } from "./components/NewFolderModal";
import { NewTextFileModal } from "./components/NewTextFileModal";
import { PreviewModal } from "./components/PreviewModal";
import { RenameModal } from "./components/RenameModal";
import { ShareFileModal } from "./components/ShareFileModal";
import { UploadProgressPanel } from "./components/UploadProgressPanel";
import { useDashboardFileView } from "./hooks/useDashboardFileView";
import { useUploadQueue } from "./hooks/useUploadQueue";
import { clearDashboardSelection } from "./actions";
import { uploadDashboardFiles } from "./uploadFiles";
import {
  shouldClearDashboardSelectionFromEscape,
  shouldFocusDashboardSearchFromShortcut,
} from "./utils/searchShortcut";

const MISSING_PATH_DISABLED_MESSAGE = "当前文件路径不存在，无法在此位置上传或新建文件";

export function Dashboard() {
  const {
    isCreatingNewFolder,
    addNewFolderName,
    pendingRenameTarget,
    pendingMoveTarget,
    pendingBatchDeleteTargets,
    pendingBatchMoveTargets,
    pendingFolderPasswordTarget,
    movingPath,
    renamingPath,
    savingTextFile,
    selectedDashboardTargets,
    shareTargets,
    sharing,
  } = useAppStore();
  const {
    currentPath,
    error,
    filteredFiles,
    filteredFolders,
    isCurrentPathMissing,
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
  const fileToolbarRef = useRef<FileToolbarHandle | null>(null);
  const isFileUploadInProgress = savingTextFile || uploadQueue.isUploading;
  const isFileMutationDisabled = Boolean(renamingPath || movingPath);
  const isBatchSelectionActive = selectedDashboardTargets.length > 0;
  const isCurrentPathMutationDisabled =
    isFileMutationDisabled || isCurrentPathMissing || isBatchSelectionActive;

  useUploadUnloadProtection(isFileUploadInProgress);

  const handleDashboardKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (
      shouldClearDashboardSelectionFromEscape(event, selectedDashboardTargets.length > 0, document)
    ) {
      event.preventDefault();
      clearDashboardSelection();
      return;
    }

    if (!shouldFocusDashboardSearchFromShortcut(event, document.activeElement)) {
      return;
    }

    event.preventDefault();
    fileToolbarRef.current?.focusSearchInput();
  });

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      handleDashboardKeyDown(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDraggingUpload(!isCurrentPathMutationDisabled);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = isCurrentPathMutationDisabled ? "none" : "copy";
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
        if (isCurrentPathMutationDisabled) {
          toast.error(
            isCurrentPathMissing
              ? MISSING_PATH_DISABLED_MESSAGE
              : "File operation in progress, please wait",
          );
          return;
        }

        const { files, source } = await getDroppedUploadFiles(event.dataTransfer);
        await uploadDashboardFiles({
          files,
          source,
          isFileMutationDisabled: false,
        });
      } catch {
        toast.error("Failed to read dropped files");
      }
    })();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DeleteConfirmModal />
      {pendingBatchDeleteTargets ? <BatchDeleteConfirmModal /> : null}
      <DirectoryStatsModal />
      <FileDetailsModal />
      {pendingRenameTarget ? <RenameModal key={pendingRenameTarget.path} /> : null}
      {pendingMoveTarget ? <MoveModal key={pendingMoveTarget.path} /> : null}
      {pendingBatchMoveTargets ? <BatchMoveModal /> : null}
      {pendingFolderPasswordTarget ? (
        <FolderPasswordModal
          key={`${pendingFolderPasswordTarget.mode}:${pendingFolderPasswordTarget.path}`}
        />
      ) : null}
      {sharing && shareTargets.length > 0 ? (
        <ShareFileModal key={shareTargets.map((target) => target.path).join("\n")} />
      ) : null}
      <PreviewModal />
      {isCreatingNewFolder ? <NewFolderModal key={addNewFolderName} /> : null}
      <NewTextFileModal />
      <UploadProgressPanel />
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <FileTreeSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex min-h-full flex-col">
              <div className="mx-auto flex w-[98%] max-w-300 flex-1 flex-col gap-4 py-3 md:w-[96%]">
                <section className="card bg-base-100 shadow-sm">
                  <div
                    className={cn(
                      "card-body gap-6 rounded-box border border-transparent p-5 transition-colors duration-150",
                      isDraggingUpload && "border-primary bg-primary/30 ring-2 ring-primary/40",
                    )}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <FileToolbar ref={fileToolbarRef} isCurrentPathMissing={isCurrentPathMissing} />

                    {isCurrentPathMissing ? (
                      <div className="rounded-box border border-warning/30 bg-warning/10 p-10">
                        <div className="flex flex-col items-center gap-3 text-center text-base-content/70">
                          <MdiAlertCircleOutline className="h-12 w-12 text-warning" />
                          <div className="space-y-1">
                            <h2 className="text-base font-medium text-base-content">
                              当前文件路径不存在
                            </h2>
                            <p className="break-all text-sm">
                              无法找到路径{" "}
                              <span className="font-mono text-base-content">/{currentPath}</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : error ? (
                      <div className="rounded-box border border-base-300 bg-base-200 p-10">
                        <div className="flex flex-col items-center gap-3 text-center text-base-content/60">
                          <MdiAlertCircleOutline className="h-12 w-12 text-error" />
                          <p className="text-sm">Failed to load files</p>
                        </div>
                      </div>
                    ) : (
                      <DashboardFileList
                        filteredFiles={filteredFiles}
                        filteredFolders={filteredFolders}
                        isLoading={isLoading}
                        searchInputValue={searchInputValue}
                      />
                    )}
                  </div>
                </section>
              </div>
              <footer className="shrink-0 bg-base-200 py-2 text-center text-xs text-base-content/60">
                Built at {window._buildDate ?? "N/A"}
              </footer>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
