import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Dialog } from "../../../components/Dialog";
import { useRenameFileMutation, useRenameFolderMutation } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import {
  getRenamedPath,
  getRenameValidationMessage,
  isUploadBlockingRename,
} from "../../../utils/renameValidation";
import { closeRenameTarget, setRenamingPath } from "../actions";
import { useDashboardFileView } from "../hooks/useDashboardFileView";

const UPLOAD_BLOCKED_MESSAGE = "该路径下有文件正在上传，请等待上传完成后再重命名。";

export function RenameModal() {
  const { pendingRenameTarget, renamingPath, uploadQueue } = useAppStore();
  const { data, refresh } = useDashboardFileView();
  const { renameFile } = useRenameFileMutation();
  const { renameFolder } = useRenameFolderMutation();
  const [name, setName] = useState(pendingRenameTarget?.name ?? "");
  const focusInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus();
      node.select();
    }
  }, []);

  if (!pendingRenameTarget) {
    return null;
  }

  const trimmedName = name.trim();
  const targetTypeLabel = pendingRenameTarget.type === "file" ? "文件" : "文件夹";
  const validationMessage = getRenameValidationMessage({
    currentName: pendingRenameTarget.name,
    files: data.files,
    folders: data.folders,
    name,
    type: pendingRenameTarget.type,
  });
  const renamedPath = getRenamedPath(pendingRenameTarget.path, trimmedName);
  const isUploadBlocked =
    trimmedName.length > 0 &&
    isUploadBlockingRename({
      newPath: renamedPath,
      oldPath: pendingRenameTarget.path,
      targetType: pendingRenameTarget.type,
      uploadQueue,
    });
  const isRenaming = Boolean(renamingPath);
  const confirmDisabled = Boolean(validationMessage) || isUploadBlocked || isRenaming;

  const handleClose = () => {
    if (!isRenaming) {
      closeRenameTarget();
    }
  };

  const handleSave = async () => {
    if (confirmDisabled) {
      return;
    }

    setRenamingPath(pendingRenameTarget.path);
    try {
      if (pendingRenameTarget.type === "file") {
        await renameFile(pendingRenameTarget.path, trimmedName);
      } else {
        await renameFolder(pendingRenameTarget.path, trimmedName);
      }
      await refresh();
      toast.success(`"${pendingRenameTarget.name}" renamed`);
      closeRenameTarget();
    } catch (error) {
      await refresh();
      toast.error(error instanceof Error ? error.message : "Failed to rename");
    } finally {
      setRenamingPath(null);
    }
  };

  return (
    <Dialog
      isOpen
      title="重命名"
      onClose={handleClose}
      onConfirm={handleSave}
      confirmText="保存"
      confirmPendingText="保存中..."
      confirmDisabled={confirmDisabled}
      confirmLoading={isRenaming}
      isDismissDisabled={isRenaming}
      boxClassName="max-w-md border border-base-300/70 bg-base-100"
      closeButtonAriaLabel="关闭重命名弹窗"
    >
      {({ isInteractionDisabled }) => (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-base-content/70">
            将 “{pendingRenameTarget.name}” {targetTypeLabel}重命名为
          </p>
          <label className="form-control gap-1.5">
            <input
              ref={focusInputRef}
              type="text"
              className={`input input-bordered w-full ${validationMessage || isUploadBlocked ? "input-error" : ""}`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isInteractionDisabled}
              autoFocus
            />
            {validationMessage ? (
              <span className="text-xs text-error">{validationMessage}</span>
            ) : null}
            {isUploadBlocked ? (
              <span className="text-xs text-error">{UPLOAD_BLOCKED_MESSAGE}</span>
            ) : null}
          </label>
        </div>
      )}
    </Dialog>
  );
}
