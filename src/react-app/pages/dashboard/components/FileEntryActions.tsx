import type { ComponentType, SVGProps } from "react";
import MdiDeleteOutline from "~icons/mdi/delete-outline";
import MdiDotsHorizontal from "~icons/mdi/dots-horizontal";
import MdiDotsVertical from "~icons/mdi/dots-vertical";
import MdiDownload from "~icons/mdi/download";
import MdiFolderMoveOutline from "~icons/mdi/folder-move-outline";
import MdiInformationOutline from "~icons/mdi/information-outline";
import MdiPencil from "~icons/mdi/pencil";
import MdiShareVariantOutline from "~icons/mdi/share-variant-outline";
import type { FileEntry, FolderEntry } from "../../../../types";
import { Dropdown } from "../../../components/Dropdown";
import { useAppStore } from "../../../store";
import {
  openDirectoryStats,
  openFileDetails,
  openFileShare,
  requestDeleteTarget,
  requestMoveTarget,
  requestRenameTarget,
} from "../actions";
import { downloadDashboardFile } from "../fileOperations";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type RowActionsMenuVariant = "table" | "grid";

type RowActionItem = {
  label: string;
  Icon: IconComponent;
  tone?: "default" | "danger";
  onClick: () => void;
};

export function RowActionsMenu({
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
      trigger={!isLoading && <DotsIcon className="h-4 w-4" />}
      triggerClassName={`${buttonClassName} cursor-pointer ${isLoading ? "loading" : ""}`}
      triggerAriaLabel="更多操作"
      disabled={isActionDisabled}
      contentClassName="menu menu-sm bg-base-200 rounded-box z-[100] mt-1 w-40 border border-base-300/60 p-2 shadow-lg space-y-1"
    >
      <>
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={`gap-2 ${item.tone === "danger" ? "text-error" : ""}`}
              onClick={item.onClick}
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
  const { deletingFolderPath, movingPath, renamingPath } = useAppStore();
  const isLoading =
    deletingFolderPath === folder.path ||
    renamingPath === folder.path ||
    movingPath === folder.path;
  const isActionDisabled = Boolean(renamingPath || movingPath) || isLoading;

  return (
    <RowActionsMenu
      isActionDisabled={isActionDisabled}
      isLoading={isLoading}
      variant={variant}
      items={[
        {
          label: "重命名",
          Icon: MdiPencil,
          onClick: () =>
            requestRenameTarget({ type: "folder", path: folder.path, name: folder.name }),
        },
        {
          label: "移动",
          Icon: MdiFolderMoveOutline,
          onClick: () =>
            requestMoveTarget({ type: "folder", path: folder.path, name: folder.name }),
        },
        {
          label: "删除",
          Icon: MdiDeleteOutline,
          tone: "danger",
          onClick: () =>
            requestDeleteTarget({ type: "folder", path: folder.path, name: folder.name }),
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
