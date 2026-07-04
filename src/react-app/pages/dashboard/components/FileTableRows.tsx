import MdiFolder from "~icons/mdi/folder";
import MdiLock from "~icons/mdi/lock";
import MdiLockOpenVariant from "~icons/mdi/lock-open-variant";
import { useRef } from "react";
import type { BatchOperationTarget, FileEntry, FolderEntry } from "../../../../types";
import { getFileIcon } from "../../../constants/fileIcons";
import { useAppStore } from "../../../store";
import { cn } from "../../../utils/cn";
import { formatBytes, formatDate, formatDetailedDate } from "../../../utils/fileFormatters";
import { getFolderUnlockTokenFromTokens } from "../../../utils/folderUnlockTokens";
import { openFilePreview, openFolderPasswordModal } from "../actions";
import { useDashboardEntrySelection } from "../hooks/useDashboardEntrySelection";
import { useDashboardLocatedFileHighlight } from "../hooks/useDashboardLocatedFileHighlight";
import { useDashboardPath } from "../hooks/useDashboardPath";
import { getDashboardFolderOpenAction } from "../utils/dashboardFolderNavigation";
import type { SearchMatchRange } from "../utils/searchMatch";
import { FileActionsMenu, FolderActionsMenu } from "./FileEntryActions";
import { FileEntryName } from "./FileEntryName";

const ENTRY_CHECKBOX_CLASS = "checkbox checkbox-primary border-2 checkbox-sm h-5 w-5 shrink-0";
const STRIPED_ROW_CLASS = "even:bg-base-200/50";
const SELECTED_ROW_CLASS = "[&_td]:bg-primary/15";
const LOCATED_FILE_ROW_CLASS = "[&_td]:bg-warning/20 [&_td]:transition-colors [&_td]:duration-500";

function TableEntryCheckbox({
  ariaLabel,
  checked,
  className = "",
  onClick,
}: {
  ariaLabel: string;
  checked: boolean;
  className?: string;
  onClick: (event: React.MouseEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="checkbox"
      className={cn(ENTRY_CHECKBOX_CLASS, className)}
      checked={checked}
      readOnly
      onClick={onClick}
      aria-label={ariaLabel}
    />
  );
}

function TableActionsSlot({
  children,
  isSelectionActive,
}: {
  children: React.ReactNode;
  isSelectionActive: boolean;
}) {
  return (
    <div
      className={cn("flex justify-end", isSelectionActive && "invisible pointer-events-none")}
      aria-hidden={isSelectionActive}
    >
      {children}
    </div>
  );
}

type DashboardFolder = FolderEntry & {
  searchMatchRanges?: SearchMatchRange[];
};

type DashboardFile = FileEntry & {
  searchMatchRanges?: SearchMatchRange[];
};

function FolderTableIcon({
  isPasswordVerified,
  passwordProtected,
}: {
  isPasswordVerified: boolean;
  passwordProtected: boolean;
}) {
  const LockIcon = isPasswordVerified ? MdiLockOpenVariant : MdiLock;

  return (
    <span className="relative inline-flex h-5 w-5 shrink-0 items-center justify-center">
      <MdiFolder className="h-5 w-5 text-warning" />
      {passwordProtected ? (
        <span
          className={cn(
            "absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-base-100 shadow-sm ring-1 ring-base-300/70",
            isPasswordVerified ? "text-success" : "text-base-content",
          )}
        >
          <LockIcon className="h-2.5 w-2.5" />
        </span>
      ) : null}
    </span>
  );
}

export function FolderRow({
  folder,
  visibleTargets,
}: {
  folder: DashboardFolder;
  visibleTargets: BatchOperationTarget[];
}) {
  const { setPath } = useDashboardPath();
  const { folderUnlockTokens } = useAppStore();
  const rowKey = `folder:${folder.path}`;
  const isPasswordVerified = Boolean(getFolderUnlockTokenFromTokens(folderUnlockTokens, folder.path));
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
    <tr
      className={cn(
        "group",
        STRIPED_ROW_CLASS,
        selection.isSelectionActive && "cursor-pointer",
        selection.isSelected && SELECTED_ROW_CLASS,
      )}
      onClick={selection.handleActiveSelectionClick}
      onPointerDown={selection.handlePointerDown}
      onPointerUp={selection.handlePointerEnd}
      onPointerLeave={selection.handlePointerEnd}
      onPointerCancel={selection.handlePointerEnd}
    >
      <td className="min-w-0">
        <span className="flex w-full min-w-0 items-center gap-1 @min-[40rem]:gap-2 align-middle">
          {selection.isSelectionActive ? (
            <>
              <TableEntryCheckbox
                ariaLabel={`选择文件夹 ${folder.name}`}
                checked={selection.isSelected}
                onClick={selection.handleSelectionClick}
              />
              <FolderTableIcon
                isPasswordVerified={isPasswordVerified}
                passwordProtected={folder.passwordProtected}
              />
            </>
          ) : (
            <span className="relative h-5 w-5 shrink-0">
              <span className="absolute inset-0 transition-opacity group-hover:opacity-0">
                <FolderTableIcon
                  isPasswordVerified={isPasswordVerified}
                  passwordProtected={folder.passwordProtected}
                />
              </span>
              <TableEntryCheckbox
                ariaLabel={`选择文件夹 ${folder.name}`}
                checked={selection.isSelected}
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                onClick={selection.handleSelectionClick}
              />
            </span>
          )}
          <button
            type="button"
            className={cn(
              "block min-w-0 truncate text-left font-bold",
              selection.isSelectionActive ? "cursor-pointer text-base-content" : "link link-hover",
            )}
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
          >
            <FileEntryName name={folder.name} ranges={folder.searchMatchRanges} entryKey={rowKey} />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 @min-[40rem]:table-cell select-none">-</td>
      <td className="hidden whitespace-nowrap text-base-content/50 @min-[40rem]:table-cell text-xs select-none">
        {formatDate(folder.createdAt)}
      </td>
      <td className="text-right">
        <TableActionsSlot isSelectionActive={selection.isSelectionActive}>
          <FolderActionsMenu folder={folder} />
        </TableActionsSlot>
      </td>
    </tr>
  );
}

export function FileRow({
  file,
  visibleTargets,
}: {
  file: DashboardFile;
  visibleTargets: BatchOperationTarget[];
}) {
  const fileIcon = getFileIcon(file.name);
  const rowKey = `file:${file.path}`;
  const createdAtTooltip = `创建时间：${formatDetailedDate(file.createdAt)}`;
  const locatedFileRef = useRef<HTMLTableRowElement>(null);
  const isLocatedFileHighlighted = useDashboardLocatedFileHighlight(file.path, locatedFileRef);
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
    <tr
      ref={locatedFileRef}
      className={cn(
        "group",
        STRIPED_ROW_CLASS,
        selection.isSelectionActive && "cursor-pointer",
        selection.isSelected && SELECTED_ROW_CLASS,
        isLocatedFileHighlighted && LOCATED_FILE_ROW_CLASS,
      )}
      data-dashboard-file-path={file.path}
      onClick={selection.handleActiveSelectionClick}
      onPointerDown={selection.handlePointerDown}
      onPointerUp={selection.handlePointerEnd}
      onPointerLeave={selection.handlePointerEnd}
      onPointerCancel={selection.handlePointerEnd}
    >
      <td className="min-w-0 font-medium">
        <span className="flex w-full min-w-0 items-start gap-1 @min-[40rem]:gap-2 align-middle">
          {selection.isSelectionActive ? (
            <>
              <TableEntryCheckbox
                ariaLabel={`选择文件 ${file.name}`}
                checked={selection.isSelected}
                onClick={selection.handleSelectionClick}
              />
              <fileIcon.Icon className={cn("h-5 w-5 shrink-0", fileIcon.color)} />
            </>
          ) : (
            <span className="relative h-5 w-5 shrink-0">
              <fileIcon.Icon
                className={cn(
                  "absolute inset-0 h-5 w-5 transition-opacity group-hover:opacity-0",
                  fileIcon.color,
                )}
              />
              <TableEntryCheckbox
                ariaLabel={`选择文件 ${file.name}`}
                checked={selection.isSelected}
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                onClick={selection.handleSelectionClick}
              />
            </span>
          )}
          <button
            type="button"
            className={cn(
              "min-w-0 truncate text-left",
              selection.isSelectionActive ? "cursor-pointer text-base-content" : "link link-hover",
            )}
            onClick={(event) => {
              if (selection.handleActiveSelectionClick(event)) {
                return;
              }
              if (selection.shouldIgnoreEntryOpen()) {
                return;
              }
              openFilePreview(file);
            }}
          >
            <FileEntryName name={file.name} ranges={file.searchMatchRanges} entryKey={rowKey} />
          </button>
        </span>
      </td>
      <td className="hidden text-base-content/50 @min-[40rem]:table-cell text-xs select-none">
        <span>{formatBytes(file.size)}</span>
      </td>
      <td className="hidden whitespace-nowrap text-base-content/50 @min-[40rem]:table-cell text-xs select-none">
        {/* <span className="tooltip" data-tip={createdAtTooltip}> */}
        <span title={createdAtTooltip}>{formatDate(file.uploadedAt)}</span>
        {/* </span> */}
      </td>
      <td className="text-right">
        <TableActionsSlot isSelectionActive={selection.isSelectionActive}>
          <FileActionsMenu file={file} />
        </TableActionsSlot>
      </td>
    </tr>
  );
}
