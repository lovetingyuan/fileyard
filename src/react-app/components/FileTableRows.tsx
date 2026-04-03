import { Icon } from "@iconify/react";
import type { FolderEntry, FileEntry } from "../../types";
import { formatBytes, formatDate } from "../utils/fileFormatters";
import { getFileIcon } from "../constants/fileIcons";

interface NewFolderRowProps {
  defaultName: string;
  inputRef: React.RefCallback<HTMLInputElement>;
  onBlur: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
}

export function NewFolderRow({ defaultName, inputRef, onBlur, onKeyDown }: NewFolderRowProps) {
  return (
    <tr>
      <td className="min-w-0">
        <span className="inline-flex w-full min-w-0 items-center gap-1">
          <Icon icon="mdi:folder" className="h-5 w-5 shrink-0 text-warning" />
          <input
            ref={inputRef}
            type="text"
            className="input input-sm input-bordered w-full min-w-0 sm:w-48"
            defaultValue={defaultName}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell">-</td>
      <td className="hidden text-base-content/50 sm:table-cell">-</td>
      <td className="text-right"></td>
    </tr>
  );
}

interface FolderRowProps {
  folder: FolderEntry & { isOptimistic?: boolean };
  busy: boolean;
  isDeletingFolder: boolean;
  onNavigate: (path: string) => void;
  onDelete: (path: string, name: string) => void;
}

export function FolderRow({
  folder,
  busy,
  isDeletingFolder,
  onNavigate,
  onDelete,
}: FolderRowProps) {
  const isOptimistic = "isOptimistic" in folder;
  return (
    <tr className={isOptimistic ? "opacity-60" : ""}>
      <td className="min-w-0">
        <span className="flex w-full min-w-0 items-center gap-1 sm:gap-2 align-middle">
          <Icon
            icon={isOptimistic ? "mdi:folder-sync" : "mdi:folder"}
            className="h-5 w-5 shrink-0 text-warning"
          />
          {isOptimistic && <span className="loading loading-spinner loading-xs shrink-0"></span>}
          <button
            type="button"
            className="block min-w-0 truncate text-left font-medium link link-hover"
            onClick={() => onNavigate(folder.path)}
          >
            {folder.name}
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell">-</td>
      <td className="hidden text-base-content/50 sm:table-cell">-</td>
      <td className="text-right">
        {!isOptimistic && (
          <div className="flex justify-end gap-1 sm:gap-2">
            <div className="dropdown dropdown-top dropdown-end">
              <button
                type="button"
                tabIndex={0}
                className={`btn btn-ghost btn-xs btn-square text-error sm:btn-sm ${isDeletingFolder ? "loading" : ""}`}
                disabled={busy}
              >
                <Icon icon="mdi:delete-outline" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
              <ul
                tabIndex={0}
                className="dropdown-content menu menu-sm bg-base-200 rounded-box z-10 w-40 p-2 shadow-sm"
              >
                <li>
                  <button
                    type="button"
                    className="text-error"
                    onClick={() => {
                      (document.activeElement as HTMLElement)?.blur();
                      onDelete(folder.path, folder.name);
                    }}
                  >
                    确认删除？
                  </button>
                </li>
              </ul>
            </div>
          </div>
        )}
      </td>
    </tr>
  );
}

interface FileRowProps {
  file: FileEntry;
  busy: boolean;
  isDeletingFile: boolean;
  isDownloading: boolean;
  onDownload: (path: string, name: string) => void;
  onDelete: (path: string, name: string) => void;
  onPreview: (file: FileEntry) => void;
}

export function FileRow({
  file,
  busy,
  isDeletingFile,
  isDownloading,
  onDownload,
  onDelete,
  onPreview,
}: FileRowProps) {
  const fileIcon = getFileIcon(file.name);
  return (
    <tr>
      <td className="min-w-0 font-medium">
        <span className="flex w-full min-w-0 items-start gap-1 sm:gap-2 align-middle">
          <Icon icon={fileIcon.icon} className={`h-5 w-5 shrink-0 ${fileIcon.color}`} />
          <button
            type="button"
            className="min-w-0 truncate text-left link link-hover"
            onClick={() => onPreview(file)}
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
        {formatDate(file.uploadedAt)}
      </td>
      <td className="text-right">
        <div className="flex justify-end gap-1 sm:gap-2">
          <button
            type="button"
            className={`btn btn-ghost btn-xs btn-square sm:btn-sm ${isDownloading ? "loading" : ""}`}
            disabled={busy}
            onClick={() => onDownload(file.path, file.name)}
          >
            <Icon icon="mdi:download" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <div className="dropdown dropdown-top dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className={`btn btn-ghost btn-xs btn-square text-error sm:btn-sm ${isDeletingFile ? "loading" : ""}`}
              disabled={busy}
            >
              <Icon icon="mdi:delete-outline" className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
            <ul
              tabIndex={0}
              className="dropdown-content menu menu-sm bg-base-200 rounded-box z-10 w-40 p-2 shadow-sm"
            >
              <li>
                <button
                  type="button"
                  className="text-error"
                  onClick={() => {
                    (document.activeElement as HTMLElement)?.blur();
                    onDelete(file.path, file.name);
                  }}
                >
                  确认删除？
                </button>
              </li>
            </ul>
          </div>
        </div>
      </td>
    </tr>
  );
}
