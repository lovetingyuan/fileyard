import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { Dialog } from "../../../components/Dialog";
import { useCreateFolderMutation } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { validateFolderName } from "../../../utils/folderValidation";
import { closeCreateFolder, setCreatingFolder } from "../actions";
import { useDashboardFileView } from "../hooks/useDashboardFileView";
import { useDashboardPath } from "../hooks/useDashboardPath";

export function NewFolderModal() {
  const { addNewFolderName, creatingFolder, isCreatingNewFolder } = useAppStore();
  const { currentPath } = useDashboardPath();
  const { addOptimisticFolder, refresh, removeOptimisticFolder } = useDashboardFileView();
  const { createFolder } = useCreateFolderMutation();
  const [name, setName] = useState(addNewFolderName);
  const focusInputRef = useCallback((node: HTMLInputElement | null) => {
    if (node) {
      node.focus();
      node.select();
    }
  }, []);

  if (!isCreatingNewFolder) {
    return null;
  }

  const trimmedName = name.trim();
  const validationMessage = validateFolderName(trimmedName);
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

    const optimisticPath = addOptimisticFolder(trimmedName);
    setCreatingFolder(true);
    try {
      await createFolder(currentPath, trimmedName);
      await refresh();
      removeOptimisticFolder(optimisticPath);
      closeCreateFolder();
      toast.success("Folder created");
    } catch (error) {
      removeOptimisticFolder(optimisticPath);
      toast.error(error instanceof Error ? error.message : "Failed to create folder");
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
            ref={focusInputRef}
            type="text"
            className={`input input-bordered w-full ${validationMessage ? "input-error" : ""}`}
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isInteractionDisabled}
            autoFocus
          />
          {validationMessage ? <span className="text-xs text-error">{validationMessage}</span> : null}
        </label>
      )}
    </Dialog>
  );
}
