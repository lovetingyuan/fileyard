import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import toast from "react-hot-toast";
import { Dialog } from "../../../components/Dialog";
import { useDeleteFileMutation, useDeleteFolderMutation } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import {
  closeDeleteTarget,
  setDeletingFilePath,
  setDeletingFolderPath,
} from "../actions";
import { useDashboardFileView } from "../hooks/useDashboardFileView";
import {
  FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE,
  isFolderOperationBlockedByActiveUpload,
} from "../hooks/useUploadQueue";

export function DeleteConfirmModal() {
  const { deletingFilePath, deletingFolderPath, pendingDeleteTarget, uploadQueue } = useAppStore();
  const { refresh } = useDashboardFileView();
  const { deleteFile } = useDeleteFileMutation();
  const { deleteFolder } = useDeleteFolderMutation();

  if (!pendingDeleteTarget) {
    return null;
  }

  const isBusy =
    (pendingDeleteTarget.type === "file" && deletingFilePath === pendingDeleteTarget.path) ||
    (pendingDeleteTarget.type === "folder" && deletingFolderPath === pendingDeleteTarget.path);
  const title = pendingDeleteTarget.type === "file" ? "删除文件" : "删除文件夹";
  const description =
    pendingDeleteTarget.type === "file"
      ? `确认删除 “${pendingDeleteTarget.name}” 吗？此操作无法撤销。`
      : `确认删除文件夹 “${pendingDeleteTarget.name}” 吗？此操作无法撤销。`;

  const handleClose = () => {
    if (!isBusy) {
      closeDeleteTarget();
    }
  };

  const deleteCurrentFile = async () => {
    setDeletingFilePath(pendingDeleteTarget.path);
    try {
      await deleteFile(pendingDeleteTarget.path);
      await refresh();
      toast.success(`"${pendingDeleteTarget.name}" deleted`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete file");
      return false;
    } finally {
      setDeletingFilePath(null);
    }
  };

  const deleteCurrentFolder = async () => {
    setDeletingFolderPath(pendingDeleteTarget.path);
    try {
      await deleteFolder(pendingDeleteTarget.path);
      await refresh();
      toast.success(`Folder "${pendingDeleteTarget.name}" deleted`);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete folder");
      return false;
    } finally {
      setDeletingFolderPath(null);
    }
  };

  const handleConfirm = async () => {
    if (isBusy) {
      return;
    }

    if (
      pendingDeleteTarget.type === "folder" &&
      isFolderOperationBlockedByActiveUpload(uploadQueue, pendingDeleteTarget.path)
    ) {
      toast.error(FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE);
      return;
    }

    const isDeleted =
      pendingDeleteTarget.type === "file" ? await deleteCurrentFile() : await deleteCurrentFolder();
    if (isDeleted) {
      closeDeleteTarget();
    }
  };

  return (
    <Dialog
      isOpen
      title={title}
      onClose={handleClose}
      onConfirm={handleConfirm}
      confirmText="确认删除"
      confirmPendingText="删除中..."
      boxClassName="max-w-md border border-error/10 bg-base-100"
      closeButtonAriaLabel="关闭删除确认弹窗"
      confirmButtonClassName="btn btn-sm btn-error text-error-content"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-full bg-error/12 text-error">
          <MdiAlertCircleOutline className="h-5 w-5" />
        </span>
        <div className="space-y-2 text-sm leading-6 text-base-content/70">
          <p>{description}</p>
        </div>
      </div>
    </Dialog>
  );
}
