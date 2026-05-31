import type { DashboardLayoutMode, FileEntry, FolderEntry } from "../../../../types";

const DASHBOARD_LAYOUT_MODE_STORAGE_KEY = "dashboard-layout-mode";

type DashboardLayoutStorage = Pick<Storage, "getItem" | "setItem">;

export type DashboardGridFolderSection<TFolder extends FolderEntry = FolderEntry> = {
  kind: "folders";
  entries: TFolder[];
};

export type DashboardGridFileSection<TFile extends FileEntry = FileEntry> = {
  kind: "files";
  entries: TFile[];
};

export type DashboardGridSection<
  TFolder extends FolderEntry = FolderEntry,
  TFile extends FileEntry = FileEntry,
> = DashboardGridFolderSection<TFolder> | DashboardGridFileSection<TFile>;

function getDashboardLayoutStorage(): DashboardLayoutStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isDashboardLayoutMode(value: string | null): value is DashboardLayoutMode {
  return value === "table" || value === "grid";
}

export function getInitialDashboardLayoutMode(
  storage: DashboardLayoutStorage | null = getDashboardLayoutStorage(),
): DashboardLayoutMode {
  if (!storage) {
    return "table";
  }

  try {
    const storedMode = storage.getItem(DASHBOARD_LAYOUT_MODE_STORAGE_KEY);
    return isDashboardLayoutMode(storedMode) ? storedMode : "table";
  } catch {
    return "table";
  }
}

export function persistDashboardLayoutMode(
  mode: DashboardLayoutMode,
  storage: DashboardLayoutStorage | null = getDashboardLayoutStorage(),
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(DASHBOARD_LAYOUT_MODE_STORAGE_KEY, mode);
  } catch {
    return;
  }
}

export function getNextDashboardLayoutMode(mode: DashboardLayoutMode): DashboardLayoutMode {
  return mode === "table" ? "grid" : "table";
}

export function createDashboardGridSections<TFolder extends FolderEntry, TFile extends FileEntry>(
  folders: TFolder[],
  files: TFile[],
): Array<DashboardGridSection<TFolder, TFile>> {
  const sections: Array<DashboardGridSection<TFolder, TFile>> = [];

  if (folders.length > 0) {
    sections.push({ kind: "folders", entries: folders });
  }

  if (files.length > 0) {
    sections.push({ kind: "files", entries: files });
  }

  return sections;
}
