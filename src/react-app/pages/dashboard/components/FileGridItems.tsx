import MdiFolder from "~icons/mdi/folder";
import type { FileEntry, FolderEntry } from "../../../../types";
import { getFileIcon } from "../../../constants/fileIcons";
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

const GRID_ITEM_CLASS =
  "group relative flex min-h-30 flex-col rounded-box border border-base-300/70 bg-base-100 p-2 pt-3 transition-colors hover:border-primary/40 hover:bg-base-200/70 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15";
const GRID_ITEM_BUTTON_CLASS =
  "flex min-h-24 w-full min-w-0 flex-1 flex-col items-center justify-start rounded-md px-1 pt-3 pb-2 text-center focus-visible:outline-none";
const GRID_ITEM_NAME_CLASS =
  "mt-2 w-full overflow-hidden break-all text-center text-xs font-medium leading-4 text-base-content [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";

export function FolderGridItem({ folder }: { folder: DashboardFolder }) {
  const { setPath } = useDashboardPath();
  const entryKey = `folder:${folder.path}`;

  return (
    <div className={GRID_ITEM_CLASS} role="listitem">
      <div className="absolute right-1 top-1 z-10">
        <FolderActionsMenu folder={folder} variant="grid" />
      </div>
      <button
        type="button"
        className={GRID_ITEM_BUTTON_CLASS}
        onClick={() => setPath(folder.path)}
        title={folder.name}
      >
        <MdiFolder className="h-10 w-10 shrink-0 text-warning" />
        <span className={`${GRID_ITEM_NAME_CLASS} font-bold`}>
          <FileEntryName name={folder.name} ranges={folder.searchMatchRanges} entryKey={entryKey} />
        </span>
      </button>
    </div>
  );
}

export function FileGridItem({ file }: { file: DashboardFile }) {
  const fileIcon = getFileIcon(file.name);
  const entryKey = `file:${file.path}`;

  return (
    <div className={GRID_ITEM_CLASS} role="listitem">
      <div className="absolute right-1 top-1 z-10">
        <FileActionsMenu file={file} variant="grid" />
      </div>
      <button
        type="button"
        className={GRID_ITEM_BUTTON_CLASS}
        onClick={() => openFilePreview(file)}
        title={file.name}
      >
        <fileIcon.Icon className={`h-10 w-10 shrink-0 ${fileIcon.color}`} />
        <span className={GRID_ITEM_NAME_CLASS}>
          <FileEntryName name={file.name} ranges={file.searchMatchRanges} entryKey={entryKey} />
        </span>
      </button>
    </div>
  );
}
