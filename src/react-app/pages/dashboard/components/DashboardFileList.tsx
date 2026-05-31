import MdiFolderOpenOutline from "~icons/mdi/folder-open-outline";
import MdiMagnifyRemoveOutline from "~icons/mdi/magnify-remove-outline";
import type { FileEntry, FolderEntry } from "../../../../types";
import { useAppStore } from "../../../store";
import { createDashboardGridSections } from "../utils/dashboardLayoutMode";
import type { SearchMatchRange } from "../utils/searchMatch";
import { FileGridItem, FolderGridItem } from "./FileGridItems";
import { FileRow, FolderRow } from "./FileTableRows";

const DASHBOARD_LOADING_ROW_COUNT = 6;
const DASHBOARD_LOADING_GRID_ITEM_COUNT = 8;
const GRID_CLASS = "grid grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-3 sm:gap-4";

type DashboardFolder = FolderEntry & {
  searchMatchRanges?: SearchMatchRange[];
};

type DashboardFile = FileEntry & {
  searchMatchRanges?: SearchMatchRange[];
};

type DashboardFileListProps = {
  filteredFiles: DashboardFile[];
  filteredFolders: DashboardFolder[];
  isLoading: boolean;
  searchInputValue: string;
};

function getEmptyStateMessage(searchInputValue: string): string {
  return searchInputValue ? `No results for "${searchInputValue}"` : "This folder is empty.";
}

function DashboardEmptyState({ searchInputValue }: { searchInputValue: string }) {
  const EmptyStateIcon = searchInputValue ? MdiMagnifyRemoveOutline : MdiFolderOpenOutline;

  return (
    <div className="flex flex-col items-center gap-2 py-15 text-center text-base-content/60">
      <EmptyStateIcon className="h-12 w-12" />
      <p className="text-sm">{getEmptyStateMessage(searchInputValue)}</p>
    </div>
  );
}

function DashboardLoadingRows() {
  return Array.from({ length: DASHBOARD_LOADING_ROW_COUNT }, (_, index) => (
    <tr key={index} data-dashboard-loading-row="true">
      <td className="min-w-0">
        <span className="flex w-full min-w-0 items-center gap-1 sm:gap-2 align-middle">
          <span className="skeleton h-5 w-5 shrink-0 rounded-sm" />
          <span className="skeleton h-4 w-36 max-w-[70%] sm:w-52" />
        </span>
      </td>
      <td className="hidden sm:table-cell">
        <span className="skeleton block h-4 w-12" />
      </td>
      <td className="hidden sm:table-cell">
        <span className="skeleton block h-4 w-28" />
      </td>
      <td className="text-right">
        <span className="skeleton ml-auto block h-5 w-8 rounded-sm" />
      </td>
    </tr>
  ));
}

function DashboardLoadingGrid() {
  return (
    <div className={GRID_CLASS} aria-busy="true">
      {Array.from({ length: DASHBOARD_LOADING_GRID_ITEM_COUNT }, (_, index) => (
        <div
          key={index}
          className="flex min-h-30 flex-col items-center rounded-box bg-base-100 p-3 pt-5"
        >
          <span className="skeleton h-10 w-10 rounded-sm" />
          <span className="skeleton mt-3 h-3 w-16 max-w-full" />
          <span className="skeleton mt-1 h-3 w-12 max-w-full" />
        </div>
      ))}
    </div>
  );
}

function DashboardTableEmptyRows({ searchInputValue }: { searchInputValue: string }) {
  return (
    <>
      <tr className={searchInputValue ? "sm:hidden" : "bg-base-100 sm:hidden"}>
        <td colSpan={2}>
          <DashboardEmptyState searchInputValue={searchInputValue} />
        </td>
      </tr>
      <tr className={searchInputValue ? "hidden sm:table-row" : "hidden bg-base-100 sm:table-row"}>
        <td colSpan={4}>
          <DashboardEmptyState searchInputValue={searchInputValue} />
        </td>
      </tr>
    </>
  );
}

function DashboardTable({
  filteredFiles,
  filteredFolders,
  isLoading,
  searchInputValue,
}: DashboardFileListProps) {
  return (
    <div>
      <table
        className="table table-zebra table-md table-fixed w-full [&_td]:px-2 [&_th]:px-2 sm:[&_td]:px-4 sm:[&_th]:px-4"
        aria-busy={isLoading}
      >
        <thead className="bg-base-300">
          <tr className="bg-base-200">
            <th className="w-auto">
              <span>Name</span>
            </th>
            <th className="hidden sm:table-cell sm:w-28">
              <span>Size</span>
            </th>
            <th className="hidden sm:table-cell sm:w-46">
              <span>Updated</span>
            </th>
            <th className="w-18 text-right sm:w-21">
              <span>Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <DashboardLoadingRows />
          ) : (
            <>
              {filteredFolders.map((folder) => (
                <FolderRow key={`folder:${folder.path}`} folder={folder} />
              ))}
              {filteredFiles.map((file) => (
                <FileRow key={`file:${file.path}`} file={file} />
              ))}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <DashboardTableEmptyRows searchInputValue={searchInputValue} />
              )}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

function DashboardGrid({
  filteredFiles,
  filteredFolders,
  isLoading,
  searchInputValue,
}: DashboardFileListProps) {
  const sections = createDashboardGridSections(filteredFolders, filteredFiles);

  if (isLoading) {
    return <DashboardLoadingGrid />;
  }

  if (sections.length === 0) {
    return <DashboardEmptyState searchInputValue={searchInputValue} />;
  }

  return (
    <div className="space-y-4" aria-busy="false">
      {sections.map((section) => {
        if (section.kind === "folders") {
          return (
            <div key={section.kind} className={GRID_CLASS} role="list" aria-label="文件夹">
              {section.entries.map((folder) => (
                <FolderGridItem key={`folder:${folder.path}`} folder={folder} />
              ))}
            </div>
          );
        }

        return (
          <div key={section.kind} className={GRID_CLASS} role="list" aria-label="文件">
            {section.entries.map((file) => (
              <FileGridItem key={`file:${file.path}`} file={file} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

export function DashboardFileList(props: DashboardFileListProps) {
  const { dashboardLayoutMode } = useAppStore();

  if (dashboardLayoutMode === "grid") {
    return <DashboardGrid {...props} />;
  }

  return <DashboardTable {...props} />;
}
