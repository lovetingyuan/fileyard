import { useCallback, useRef } from "react";
import type { ComponentType, SVGProps } from "react";
import MdiDeleteOutline from "~icons/mdi/delete-outline";
import MdiDotsHorizontal from "~icons/mdi/dots-horizontal";
import MdiDownload from "~icons/mdi/download";
import MdiFolder from "~icons/mdi/folder";
import MdiFolderSync from "~icons/mdi/folder-sync";
import MdiInformationOutline from "~icons/mdi/information-outline";
import MdiPencil from "~icons/mdi/pencil";
import MdiShareVariantOutline from "~icons/mdi/share-variant-outline";
import toast from "react-hot-toast";
import type { FileEntry, FolderEntry, OptimisticFolderEntry } from "../../../../types";
import { getFileIcon } from "../../../constants/fileIcons";
import { useCreateFolderMutation } from "../../../hooks/useFilesApi";
import { getStoreMethods, useAppStore } from "../../../store";
import { formatBytes, formatDate, formatDetailedDate } from "../../../utils/fileFormatters";
import { validateFolderName } from "../../../utils/folderValidation";
import {
  closeCreateFolder,
  openDirectoryStats,
  openFileDetails,
  openFilePreview,
  openFileShare,
  requestDeleteTarget,
  requestRenameTarget,
  setCreatingFolder,
} from "../actions";
import { downloadDashboardFile } from "../fileOperations";
import { useDashboardFileView } from "../hooks/useDashboardFileView";
import { useDashboardPath } from "../hooks/useDashboardPath";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type DashboardFolder = FolderEntry | OptimisticFolderEntry;

type RowActionItem = {
  label: string;
  Icon: IconComponent;
  tone?: "default" | "danger";
  onClick: () => void;
};

function RowActionsMenu({
  isActionDisabled,
  isLoading,
  items,
}: {
  isActionDisabled: boolean;
  isLoading?: boolean;
  items: RowActionItem[];
}) {
  return (
    <div className="dropdown dropdown-top dropdown-end">
      <button
        type="button"
        tabIndex={0}
        className={`btn btn-ghost btn-xs btn-square sm:btn-sm ${isLoading ? "loading" : ""}`}
        disabled={isActionDisabled}
        aria-label="更多操作"
      >
        {!isLoading && <MdiDotsHorizontal className="h-4 w-4" />}
      </button>
      <ul
        tabIndex={0}
        className="dropdown-content menu menu-sm bg-base-200 rounded-box z-10 mt-1 w-40 border border-base-300/60 p-2 shadow-lg space-y-1"
      >
        {items.map((item) => (
          <li key={item.label}>
            <button
              type="button"
              className={`gap-2 ${item.tone === "danger" ? "text-error" : ""}`}
              onClick={() => {
                (document.activeElement as HTMLElement | null)?.blur();
                item.onClick();
              }}
            >
              <item.Icon className="h-4 w-4" />
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NewFolderRow() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { addNewFolderName } = useAppStore();
  const { currentPath } = useDashboardPath();
  const { addOptimisticFolder, refresh, removeOptimisticFolder } = useDashboardFileView();
  const { createFolder } = useCreateFolderMutation();

  const focusRef = useCallback((node: HTMLInputElement | null) => {
    inputRef.current = node;
    if (node) {
      node.focus();
      node.select();
    }
  }, []);

  const handleBlur = async () => {
    const name = inputRef.current?.value.trim();
    const { setAddNewFolderName, setIsCreatingNewFolder } = getStoreMethods();
    setIsCreatingNewFolder(false);
    setAddNewFolderName("");

    if (!name) {
      return;
    }

    const validationError = validateFolderName(name);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const optimisticPath = addOptimisticFolder(name);
    setCreatingFolder(true);
    try {
      await createFolder(currentPath, name);
      await refresh();
      removeOptimisticFolder(optimisticPath);
      toast.success("Folder created");
    } catch (error) {
      removeOptimisticFolder(optimisticPath);
      toast.error(error instanceof Error ? error.message : "Failed to create folder");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      inputRef.current?.blur();
    } else if (event.key === "Escape") {
      closeCreateFolder();
    }
  };

  return (
    <tr>
      <td className="min-w-0">
        <span className="inline-flex w-full min-w-0 items-center gap-1">
          <MdiFolder className="h-5 w-5 shrink-0 text-warning" />
          <input
            ref={focusRef}
            type="text"
            className="input input-sm input-bordered w-full min-w-0 sm:w-48"
            defaultValue={addNewFolderName}
            onBlur={() => void handleBlur()}
            onKeyDown={handleKeyDown}
          />
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell">-</td>
      <td className="hidden text-base-content/50 sm:table-cell">-</td>
      <td className="text-right"></td>
    </tr>
  );
}

export function FolderRow({ folder }: { folder: DashboardFolder }) {
  const { setPath } = useDashboardPath();
  const { deletingFolderPath, renamingPath } = useAppStore();
  const isOptimistic = "isOptimistic" in folder;
  const FolderIcon = isOptimistic ? MdiFolderSync : MdiFolder;
  const isLoading = deletingFolderPath === folder.path || renamingPath === folder.path;
  const isActionDisabled = Boolean(renamingPath) || isLoading;

  return (
    <tr className={isOptimistic ? "opacity-60" : ""}>
      <td className="min-w-0">
        <span className="flex w-full min-w-0 items-center gap-1 sm:gap-2 align-middle">
          <FolderIcon className="h-5 w-5 shrink-0 text-warning" />
          {isOptimistic && <span className="loading loading-spinner loading-xs shrink-0"></span>}
          <button
            type="button"
            className="block min-w-0 truncate text-left font-bold link link-hover"
            onClick={() => setPath(folder.path)}
          >
            {folder.name}
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell">-</td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-[13px]">
        {isOptimistic ? "-" : formatDate(folder.createdAt)}
      </td>
      <td className="text-right">
        {!isOptimistic && (
          <RowActionsMenu
            isActionDisabled={isActionDisabled}
            isLoading={isLoading}
            items={[
              {
                label: "重命名",
                Icon: MdiPencil,
                onClick: () =>
                  requestRenameTarget({ type: "folder", path: folder.path, name: folder.name }),
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
        )}
      </td>
    </tr>
  );
}

export function FileRow({ file }: { file: FileEntry }) {
  const { deletingFilePath, downloadingPath, renamingPath } = useAppStore();
  const fileIcon = getFileIcon(file.name);
  const createdAtTooltip = `创建时间：${formatDetailedDate(file.createdAt)}`;
  const isLoading =
    deletingFilePath === file.path || downloadingPath === file.path || renamingPath === file.path;
  const isActionDisabled = Boolean(renamingPath) || isLoading;

  return (
    <tr>
      <td className="min-w-0 font-medium">
        <span className="flex w-full min-w-0 items-start gap-1 sm:gap-2 align-middle">
          <fileIcon.Icon className={`h-5 w-5 shrink-0 ${fileIcon.color}`} />
          <button
            type="button"
            className="min-w-0 truncate text-left link link-hover"
            onClick={() => openFilePreview(file)}
          >
            {file.name}
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell text-[13px]">
        <span className="tooltip" data-tip={`${file.size.toLocaleString()} 字节`}>
          {formatBytes(file.size)}
        </span>
      </td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-[13px]">
        <span className="tooltip" data-tip={createdAtTooltip}>
          <span title={createdAtTooltip}>{formatDate(file.uploadedAt)}</span>
        </span>
      </td>
      <td className="text-right">
        <RowActionsMenu
          isActionDisabled={isActionDisabled}
          isLoading={isLoading}
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
      </td>
    </tr>
  );
}
