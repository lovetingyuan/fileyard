import type { ComponentType, SVGProps } from "react";
import MdiDeleteOutline from "~icons/mdi/delete-outline";
import MdiDotsHorizontal from "~icons/mdi/dots-horizontal";
import MdiDotsVertical from "~icons/mdi/dots-vertical";
import MdiDownload from "~icons/mdi/download";
import MdiFolderMoveOutline from "~icons/mdi/folder-move-outline";
import MdiInformationOutline from "~icons/mdi/information-outline";
import MdiLockOpenVariantOutline from "~icons/mdi/lock-open-variant-outline";
import MdiLockOutline from "~icons/mdi/lock-outline";
import MdiPencil from "~icons/mdi/pencil";
import MdiShareVariantOutline from "~icons/mdi/share-variant-outline";
import toast from "react-hot-toast";
import type { FileEntry, FolderEntry } from "../../../../types";
import { Dropdown } from "../../../components/Dropdown";
import { useCheckFolderPasswordSetAllowedMutation } from "../../../hooks/useFilesApi";
import { useAppStore } from "../../../store";
import { cn } from "../../../utils/cn";
import {
  openDirectoryStats,
  openFileDetails,
  openFileShare,
  openFolderPasswordModal,
  requestDeleteTarget,
  requestMoveTarget,
  requestRenameTarget,
} from "../actions";
import { downloadDashboardFile } from "../fileOperations";
import {
  FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE,
  isFolderOperationBlockedByActiveUpload,
} from "../hooks/useUploadQueue";
import { requestMoveTargetWithFolderPreflight } from "../utils/folderMovePreflight";
import { getProtectedFolderOperationAction } from "../utils/protectedFolderActions";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type RowActionsMenuVariant = "table" | "grid";

type RowActionItem = {
  disabled?: boolean;
  disabledReason?: string;
  label: string;
  Icon: IconComponent;
  tone?: "default" | "danger";
  onClick: () => void;
};

function RowActionsMenu({
  isActionDisabled,
  isLoading,
  items,
  variant = "table",
}: {
  isActionDisabled: boolean;
  isLoading?: boolean;
  items: RowActionItem[];
  variant?: RowActionsMenuVariant;
}) {
  const DotsIcon = variant === "grid" ? MdiDotsVertical : MdiDotsHorizontal;
  const placement = variant === "grid" ? "bottom-end" : "top-end";
  const buttonClassName =
    variant === "grid"
      ? "flex h-7 min-h-7 w-7 items-center justify-center rounded-full border-0 bg-transparent p-0 text-base-content/75 shadow-none transition-colors hover:bg-base-content/10 hover:text-base-content focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40 disabled:opacity-40 disabled:hover:bg-transparent"
      : "btn btn-ghost btn-xs btn-square sm:btn-sm";

  return (
    <Dropdown
      placement={placement}
      trigger={
        isLoading ? (
          <span className="loading loading-spinner" aria-hidden="true" />
        ) : (
          <DotsIcon className="h-4 w-4" />
        )
      }
      triggerClassName={cn(buttonClassName, "cursor-pointer")}
      triggerAriaLabel="更多操作"
      disabled={isActionDisabled}
      contentClassName="menu menu-md bg-base-200 rounded-box z-[100] mt-1 w-40 border border-base-300/60 p-2 shadow-lg space-y-1"
    >
      <>
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={cn(
                "gap-2",
                item.tone === "danger" && "text-error",
                item.disabled && "cursor-not-allowed opacity-50",
              )}
              disabled={item.disabled && !item.disabledReason}
              aria-disabled={item.disabled}
              title={item.disabledReason}
              onClick={() => {
                if (item.disabled) {
                  if (item.disabledReason) {
                    toast.error(item.disabledReason);
                  }
                  return;
                }

                item.onClick();
              }}
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </button>
          </li>
        ))}
      </>
    </Dropdown>
  );
}

export function FolderActionsMenu({
  folder,
  variant = "table",
}: {
  folder: FolderEntry;
  variant?: RowActionsMenuVariant;
}) {
  const { deletingFolderPath, folderUnlockTokens, movingPath, renamingPath, uploadQueue } =
    useAppStore();
  const {
    checkFolderPasswordSetAllowed,
    isMutating: isCheckingFolderPasswordSetAllowed,
  } = useCheckFolderPasswordSetAllowedMutation();
  const isLoading =
    deletingFolderPath === folder.path ||
    renamingPath === folder.path ||
    movingPath === folder.path ||
    isCheckingFolderPasswordSetAllowed;
  const isActionDisabled = Boolean(renamingPath || movingPath) || isLoading;
  const blockIfUploading = () => {
    if (!isFolderOperationBlockedByActiveUpload(uploadQueue, folder.path)) {
      return false;
    }

    toast.error(FILE_OPERATION_UPLOAD_BLOCKED_MESSAGE);
    return true;
  };
  const requestProtectedFolderOperation = (operation: "delete" | "move" | "rename") => {
    const action = getProtectedFolderOperationAction({
      folder,
      folderUnlockTokens,
      operation,
    });
    if (action.type === "unlock") {
      openFolderPasswordModal(action.target);
      return;
    }

    if (operation === "rename") {
      requestRenameTarget(action.target);
      return;
    }

    if (operation === "move") {
      void requestMoveTargetWithFolderPreflight(action.target);
      return;
    }

    requestDeleteTarget(action.target);
  };
  const requestSetFolderPassword = async () => {
    try {
      await checkFolderPasswordSetAllowed(folder.path);
      openFolderPasswordModal({
        mode: "set",
        path: folder.path,
        name: folder.name,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "无法检查是否允许设置密码");
    }
  };

  return (
    <RowActionsMenu
      isActionDisabled={isActionDisabled}
      isLoading={isLoading}
      variant={variant}
      items={[
        {
          label: "重命名",
          Icon: MdiPencil,
          onClick: () => {
            if (blockIfUploading()) {
              return;
            }

            requestProtectedFolderOperation("rename");
          },
        },
        {
          label: "移动",
          Icon: MdiFolderMoveOutline,
          onClick: () => {
            if (blockIfUploading()) {
              return;
            }

            requestProtectedFolderOperation("move");
          },
        },
        ...(folder.passwordProtected
          ? [
              {
                label: "取消密码",
                Icon: MdiLockOpenVariantOutline,
                onClick: () =>
                  openFolderPasswordModal({
                    mode: "remove",
                    path: folder.path,
                    name: folder.name,
                    protectedPath: folder.path,
                  }),
              },
            ]
          : folder.protectedBy
            ? []
            : [
                {
                  label: "设为私密",
                  Icon: MdiLockOutline,
                  disabled: isCheckingFolderPasswordSetAllowed,
                  onClick: () => void requestSetFolderPassword(),
                },
              ]),
        {
          label: "删除",
          Icon: MdiDeleteOutline,
          tone: "danger",
          onClick: () => {
            if (blockIfUploading()) {
              return;
            }

            requestProtectedFolderOperation("delete");
          },
        },
        {
          label: "查看详情",
          Icon: MdiInformationOutline,
          onClick: () => openDirectoryStats(folder.path),
        },
      ]}
    />
  );
}

export function FileActionsMenu({
  file,
  variant = "table",
}: {
  file: FileEntry;
  variant?: RowActionsMenuVariant;
}) {
  const { deletingFilePath, downloadingPath, movingPath, renamingPath } = useAppStore();
  const isLoading =
    deletingFilePath === file.path ||
    downloadingPath === file.path ||
    renamingPath === file.path ||
    movingPath === file.path;
  const isActionDisabled = Boolean(renamingPath || movingPath) || isLoading;
  const shareDisabledReason = file.protectedBy ? "加密目录下的文件不支持分享" : undefined;

  return (
    <RowActionsMenu
      isActionDisabled={isActionDisabled}
      isLoading={isLoading}
      variant={variant}
      items={[
        {
          label: "下载",
          Icon: MdiDownload,
          onClick: () => void downloadDashboardFile(file.path, file.name),
        },
        {
          label: "分享",
          Icon: MdiShareVariantOutline,
          disabled: Boolean(file.protectedBy),
          disabledReason: shareDisabledReason,
          onClick: () => openFileShare(file),
        },
        {
          label: "重命名",
          Icon: MdiPencil,
          onClick: () => requestRenameTarget({ type: "file", path: file.path, name: file.name }),
        },
        {
          label: "移动",
          Icon: MdiFolderMoveOutline,
          onClick: () => requestMoveTarget({ type: "file", path: file.path, name: file.name }),
        },
        {
          label: "删除",
          Icon: MdiDeleteOutline,
          tone: "danger",
          onClick: () => requestDeleteTarget({ type: "file", path: file.path, name: file.name }),
        },
        {
          label: "查看详情",
          Icon: MdiInformationOutline,
          onClick: () => openFileDetails(file),
        },
      ]}
    />
  );
}
