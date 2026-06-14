import MdiFolder from "~icons/mdi/folder";
import MdiLock from "~icons/mdi/lock";
import type { BatchOperationTarget, FileEntry, FolderEntry } from "../../../../types";
import { getFileIcon } from "../../../constants/fileIcons";
import { cn } from "../../../utils/cn";
import { useAppStore } from "../../../store";
import { openFilePreview, openFolderPasswordModal } from "../actions";
import { useDashboardEntrySelection } from "../hooks/useDashboardEntrySelection";
import { useDashboardLocatedFileHighlight } from "../hooks/useDashboardLocatedFileHighlight";
import { useDashboardPath } from "../hooks/useDashboardPath";
import { getDashboardFolderOpenAction } from "../utils/dashboardFolderNavigation";
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
  "group relative z-0 flex min-h-30 flex-col rounded-box bg-base-100 p-2 pt-3 transition-colors hover:z-10 hover:bg-base-200/70 focus-within:z-50 focus-within:bg-base-200/70";
const GRID_ITEM_BUTTON_CLASS =
  "flex min-h-24 w-full min-w-0 flex-1 flex-col items-center justify-start rounded-md px-1 pt-3 pb-2 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/40";
const GRID_ITEM_NAME_CLASS =
  "mt-2 w-full overflow-hidden break-all text-center text-xs font-medium leading-4 text-base-content [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]";
const GRID_ACTIONS_CLASS =
  "absolute right-1 top-1 z-20 opacity-100 transition-opacity focus-within:z-[90] [@media(hover:hover)]:pointer-events-none [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-focus-within:pointer-events-auto [@media(hover:hover)]:group-focus-within:opacity-100 [@media(hover:hover)]:group-hover:pointer-events-auto [@media(hover:hover)]:group-hover:opacity-100";
const GRID_CHECKBOX_CLASS =
  "checkbox checkbox-primary border-2 checkbox-sm absolute left-2 top-2 z-30 h-5 w-5 transition-opacity";
const GRID_SELECTED_ITEM_CLASS = "bg-primary/15 ring-1 ring-primary/40 hover:bg-primary/20";
const GRID_LOCATED_FILE_ITEM_CLASS =
  "bg-warning/20 ring-2 ring-warning/40 transition-colors duration-500";

function GridEntryCheckbox({
  ariaLabel,
  checked,
  isSelectionActive,
  onClick,
}: {
  ariaLabel: string;
  checked: boolean;
  isSelectionActive: boolean;
  onClick: (event: React.MouseEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      className={cn(
        GRID_CHECKBOX_CLASS,
        isSelectionActive
          ? "opacity-100"
          : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100",
      )}
      checked={checked}
      readOnly
      onClick={onClick}
      aria-label={ariaLabel}
    />
  );
}

export function FolderGridItem({
  folder,
  visibleTargets,
}: {
  folder: DashboardFolder;
  visibleTargets: BatchOperationTarget[];
}) {
  const { setPath } = useDashboardPath();
  const { folderUnlockTokens } = useAppStore();
  const entryKey = `folder:${folder.path}`;
  const selection = useDashboardEntrySelection(
    {
      type: "folder",
      path: folder.path,
      name: folder.name,
      passwordProtected: folder.passwordProtected,
      protectedBy: folder.protectedBy,
    },
    visibleTargets,
  );

  return (
    <div
      className={cn(GRID_ITEM_CLASS, selection.isSelected && GRID_SELECTED_ITEM_CLASS)}
      role="listitem"
      onClick={selection.handleActiveSelectionClick}
      onPointerDown={selection.handlePointerDown}
      onPointerUp={selection.handlePointerEnd}
      onPointerLeave={selection.handlePointerEnd}
      onPointerCancel={selection.handlePointerEnd}
    >
      <GridEntryCheckbox
        ariaLabel={`选择文件夹 ${folder.name}`}
        checked={selection.isSelected}
        isSelectionActive={selection.isSelectionActive}
        onClick={selection.handleSelectionClick}
      />
      <div
        className={cn(
          GRID_ACTIONS_CLASS,
          selection.isSelectionActive && "invisible pointer-events-none",
        )}
        aria-hidden={selection.isSelectionActive}
      >
        <FolderActionsMenu folder={folder} variant="grid" />
      </div>
      <button
        type="button"
        className={GRID_ITEM_BUTTON_CLASS}
        onClick={(event) => {
          if (selection.handleActiveSelectionClick(event)) {
            return;
          }
          if (selection.shouldIgnoreEntryOpen()) {
            return;
          }
          const action = getDashboardFolderOpenAction(folder, folderUnlockTokens);
          if (action.type === "navigate") {
            setPath(action.path);
            return;
          }

          openFolderPasswordModal(action.target);
        }}
        title={folder.name}
      >
        <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center">
          <MdiFolder className="h-10 w-10 text-warning" />
          {folder.passwordProtected ? (
            <span className="absolute right-0 top-0 grid h-4 w-4 place-items-center rounded-full bg-base-100 text-base-content shadow-sm ring-1 ring-base-300/70">
              <MdiLock className="h-2.5 w-2.5" />
            </span>
          ) : null}
        </span>
        <span className={cn(GRID_ITEM_NAME_CLASS, "font-bold")}>
          <FileEntryName name={folder.name} ranges={folder.searchMatchRanges} entryKey={entryKey} />
        </span>
      </button>
    </div>
  );
}

export function FileGridItem({
  file,
  visibleTargets,
}: {
  file: DashboardFile;
  visibleTargets: BatchOperationTarget[];
}) {
  const fileIcon = getFileIcon(file.name);
  const entryKey = `file:${file.path}`;
  const locatedFile = useDashboardLocatedFileHighlight<HTMLDivElement>(file.path);
  const selection = useDashboardEntrySelection(
    {
      type: "file",
      path: file.path,
      name: file.name,
      protectedBy: file.protectedBy,
    },
    visibleTargets,
  );

  return (
    <div
      ref={locatedFile.elementRef}
      className={cn(
        GRID_ITEM_CLASS,
        selection.isSelected && GRID_SELECTED_ITEM_CLASS,
        locatedFile.isHighlighted && GRID_LOCATED_FILE_ITEM_CLASS,
      )}
      data-dashboard-file-path={file.path}
      role="listitem"
      onClick={selection.handleActiveSelectionClick}
      onPointerDown={selection.handlePointerDown}
      onPointerUp={selection.handlePointerEnd}
      onPointerLeave={selection.handlePointerEnd}
      onPointerCancel={selection.handlePointerEnd}
    >
      <GridEntryCheckbox
        ariaLabel={`选择文件 ${file.name}`}
        checked={selection.isSelected}
        isSelectionActive={selection.isSelectionActive}
        onClick={selection.handleSelectionClick}
      />
      <div
        className={cn(
          GRID_ACTIONS_CLASS,
          selection.isSelectionActive && "invisible pointer-events-none",
        )}
        aria-hidden={selection.isSelectionActive}
      >
        <FileActionsMenu file={file} variant="grid" />
      </div>
      <button
        type="button"
        className={GRID_ITEM_BUTTON_CLASS}
        onClick={(event) => {
          if (selection.handleActiveSelectionClick(event)) {
            return;
          }
          if (selection.shouldIgnoreEntryOpen()) {
            return;
          }
          openFilePreview(file);
        }}
        title={file.name}
      >
        <fileIcon.Icon className={cn("h-10 w-10 shrink-0", fileIcon.color)} />
        <span className={GRID_ITEM_NAME_CLASS}>
          <FileEntryName name={file.name} ranges={file.searchMatchRanges} entryKey={entryKey} />
        </span>
      </button>
    </div>
  );
}
