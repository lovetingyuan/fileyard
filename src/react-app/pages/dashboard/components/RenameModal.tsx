import { useCallback, useRef, useState } from "react";
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
import {
  focusRenameInput,
  getRenameConfirmButtonClassName,
  getRenameConfirmText,
  getRenameInputClassName,
  getRenameInputInitialValue,
  getRenameValidationMessageForInput,
  getVisibleRenameValidationMessage,
  isRenameConfirmDisabled,
  shouldCloseRenameWithoutSaving,
} from "../utils/renameModalInput";

const UPLOAD_BLOCKED_MESSAGE = "该路径下有文件正在上传，请等待上传完成后再重命名。";

export function RenameModal() {
  const { pendingRenameTarget, renamingPath, uploadQueue } = useAppStore();
  const { data, refresh } = useDashboardFileView();
  const { renameFile } = useRenameFileMutation();
  const { renameFolder } = useRenameFolderMutation();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(() => getRenameInputInitialValue(pendingRenameTarget?.name));
  const [hasEditedName, setHasEditedName] = useState(false);
  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
  }, []);
  const focusInputAfterOpen = useCallback(() => {
    focusRenameInput(inputRef.current);
  }, []);

  if (!pendingRenameTarget) {
    return null;
  }

  const trimmedName = name.trim();
  const targetTypeLabel = pendingRenameTarget.type === "file" ? "文件" : "文件夹";
  const rawValidationMessage = getRenameValidationMessage({
    currentName: pendingRenameTarget.name,
    files: data.files,
    folders: data.folders,
    name,
    type: pendingRenameTarget.type,
  });
  const validationMessage = getRenameValidationMessageForInput({
    currentName: pendingRenameTarget.name,
    name,
    rawValidationMessage,
  });
  const visibleValidationMessage = getVisibleRenameValidationMessage(
    validationMessage,
    hasEditedName,
  );
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
  const confirmDisabled = isRenameConfirmDisabled({
    isRenaming,
    isUploadBlocked,
    validationMessage,
  });
  const confirmText = getRenameConfirmText({
    currentName: pendingRenameTarget.name,
    name,
    type: pendingRenameTarget.type,
  });
  const confirmButtonClassName = getRenameConfirmButtonClassName({
    currentName: pendingRenameTarget.name,
    name,
    type: pendingRenameTarget.type,
  });

  const handleClose = () => {
    if (!isRenaming) {
      closeRenameTarget();
    }
  };

  const handleSave = async () => {
    if (confirmDisabled) {
      return;
    }

    if (
      shouldCloseRenameWithoutSaving({
        currentName: pendingRenameTarget.name,
        name,
      })
    ) {
      closeRenameTarget();
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
      confirmText={confirmText}
      confirmButtonClassName={confirmButtonClassName}
      confirmPendingText="保存中..."
      confirmDisabled={confirmDisabled}
      confirmLoading={isRenaming}
      isDismissDisabled={isRenaming}
      boxClassName="max-w-md border border-base-300/70 bg-base-100"
      closeButtonAriaLabel="关闭重命名弹窗"
      onAfterOpen={focusInputAfterOpen}
    >
      {({ isInteractionDisabled }) => (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-base-content/70">
            将 “{pendingRenameTarget.name}” {targetTypeLabel}重命名为
          </p>
          <label className="form-control gap-1.5">
            <input
              ref={setInputRef}
              type="text"
              className={getRenameInputClassName({
                isUploadBlocked,
                visibleValidationMessage,
              })}
              value={name}
              onChange={(event) => {
                setHasEditedName(true);
                setName(event.target.value);
              }}
              disabled={isInteractionDisabled}
              autoFocus
            />
            {visibleValidationMessage ? (
              <span className="text-xs text-error">{visibleValidationMessage}</span>
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
