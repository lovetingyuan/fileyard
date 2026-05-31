import type { DashboardLayoutMode, FileEntry, FolderEntry } from "../../../../types";

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
