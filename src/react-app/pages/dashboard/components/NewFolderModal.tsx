import { useCallback, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Dialog } from "../../../components/Dialog";
import { useCreateFolderMutation } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { validateFolderName } from "../../../utils/folderValidation";
import { closeCreateFolder, setCreatingFolder } from "../actions";
import { useDashboardFileView } from "../hooks/useDashboardFileView";
import { useDashboardPath } from "../hooks/useDashboardPath";
import { focusFolderNameInput, getNewFolderFieldErrorMessage } from "./newFolderModalState";

export function getCreateFolderErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Failed to create folder";
}

export function NewFolderModal() {
  const { addNewFolderName, creatingFolder, isCreatingNewFolder } = useAppStore();
  const { currentPath } = useDashboardPath();
  const { refresh } = useDashboardFileView();
  const { createFolder } = useCreateFolderMutation();
  const [name, setName] = useState(addNewFolderName);
  const [createErrorMessage, setCreateErrorMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const setInputRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
  }, []);
  const handleAfterOpen = useCallback(() => {
    focusFolderNameInput(inputRef.current);
  }, []);

  if (!isCreatingNewFolder) {
    return null;
  }

  const trimmedName = name.trim();
  const validationMessage = validateFolderName(trimmedName);
  const fieldErrorMessage = getNewFolderFieldErrorMessage({
    createErrorMessage,
    trimmedName,
    validationMessage,
  });
  const confirmDisabled = Boolean(validationMessage) || creatingFolder;

  const handleClose = () => {
    if (!creatingFolder) {
      closeCreateFolder();
    }
  };

  const handleCreate = async () => {
    if (confirmDisabled) {
      return;
    }

    setCreateErrorMessage(null);
    setCreatingFolder(true);
    try {
      await createFolder(currentPath, trimmedName);
      await refresh();
      closeCreateFolder();
      toast.success("Folder created");
    } catch (error) {
      setCreateErrorMessage(getCreateFolderErrorMessage(error));
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <Dialog
      isOpen
      title="新建文件夹"
      onClose={handleClose}
      onConfirm={handleCreate}
      onAfterOpen={handleAfterOpen}
      confirmText="创建"
      confirmPendingText="创建中..."
      confirmDisabled={confirmDisabled}
      confirmLoading={creatingFolder}
      isDismissDisabled={creatingFolder}
      boxClassName="max-w-md border border-base-300/70 bg-base-100"
      closeButtonAriaLabel="关闭新建文件夹弹窗"
    >
      {({ isInteractionDisabled }) => (
        <label className="form-control gap-1.5">
          <span className="label-text text-sm">文件夹名称</span>
          <input
            ref={setInputRef}
            type="text"
            className={`input input-bordered w-full ${fieldErrorMessage ? "input-error" : ""}`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setCreateErrorMessage(null);
            }}
            disabled={isInteractionDisabled}
          />
          {fieldErrorMessage ? <span className="text-xs text-error">{fieldErrorMessage}</span> : null}
        </label>
      )}
    </Dialog>
  );
}
