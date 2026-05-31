import MdiFolder from "~icons/mdi/folder";
import type { FileEntry, FolderEntry } from "../../../../types";
import { getFileIcon } from "../../../constants/fileIcons";
import { formatBytes, formatDate, formatDetailedDate } from "../../../utils/fileFormatters";
import { openFilePreview } from "../actions";
import { useDashboardPath } from "../hooks/useDashboardPath";
import type { SearchMatchRange } from "../utils/searchMatch";
import { FileActionsMenu, FolderActionsMenu } from "./FileEntryActions";
import { FileEntryName } from "./FileEntryName";

type DashboardFolder = FolderEntry & {
  searchMatchRanges?: SearchMatchRange[];
};

type DashboardFile = FileEntry & {
  searchMatchRanges?: SearchMatchRange[];
};

export function FolderRow({ folder }: { folder: DashboardFolder }) {
  const { setPath } = useDashboardPath();
  const rowKey = `folder:${folder.path}`;

  return (
    <tr>
      <td className="min-w-0">
        <span className="flex w-full min-w-0 items-center gap-1 sm:gap-2 align-middle">
          <MdiFolder className="h-5 w-5 shrink-0 text-warning" />
          <button
            type="button"
            className="block min-w-0 truncate text-left font-bold link link-hover"
            onClick={() => setPath(folder.path)}
          >
            <FileEntryName name={folder.name} ranges={folder.searchMatchRanges} entryKey={rowKey} />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell select-none">-</td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-xs select-none">
        {formatDate(folder.createdAt)}
      </td>
      <td className="text-right">
        <FolderActionsMenu folder={folder} />
      </td>
    </tr>
  );
}

export function FileRow({ file }: { file: DashboardFile }) {
  const fileIcon = getFileIcon(file.name);
  const rowKey = `file:${file.path}`;
  const createdAtTooltip = `创建时间：${formatDetailedDate(file.createdAt)}`;

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
            <FileEntryName name={file.name} ranges={file.searchMatchRanges} entryKey={rowKey} />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 sm:table-cell text-xs select-none">
        <span className="tooltip" data-tip={`${file.size.toLocaleString()} 字节`}>
          {formatBytes(file.size)}
        </span>
      </td>
      <td className="hidden whitespace-nowrap text-base-content/50 sm:table-cell text-xs select-none">
        <span className="tooltip" data-tip={createdAtTooltip}>
          <span title={createdAtTooltip}>{formatDate(file.uploadedAt)}</span>
        </span>
      </td>
      <td className="text-right">
        <FileActionsMenu file={file} />
      </td>
    </tr>
  );
}
