import type {
  DashboardLayoutMode,
  DeleteTarget,
  FileEntry,
  MoveTarget,
  NewTextFileDraft,
  RenameTarget,
  SortKey,
  UploadQueueItem,
} from "../../../types";
import { getStoreMethods } from "../../store";
import { getNextDashboardLayoutMode } from "./utils/dashboardLayoutMode";

export function setDashboardSearchInput(value: string) {
  const { setSearchInputValue, setSearchKeyword } = getStoreMethods();

  setSearchInputValue(value);
  setSearchKeyword(value);
}

export function clearDashboardSearch() {
  setDashboardSearchInput("");
}

export function resetDashboardPathState() {
  clearDashboardSearch();
}

export function toggleDashboardSort(key: SortKey) {
  const { getDashboardSortKey, getDashboardSortOrder, setDashboardSortKey, setDashboardSortOrder } =
    getStoreMethods();

  if (getDashboardSortKey() === key) {
    setDashboardSortOrder(getDashboardSortOrder() === "asc" ? "desc" : "asc");
    return;
  }

  setDashboardSortKey(key);
  setDashboardSortOrder(key === "name" ? "asc" : "desc");
}

export function setDashboardLayoutMode(mode: DashboardLayoutMode) {
  const { setDashboardLayoutMode } = getStoreMethods();

  setDashboardLayoutMode(mode);
}

export function toggleDashboardLayoutMode() {
  const { getDashboardLayoutMode } = getStoreMethods();

  setDashboardLayoutMode(getNextDashboardLayoutMode(getDashboardLayoutMode()));
}

export function startCreateFolder(defaultName: string) {
  const { setAddNewFolderName, setIsCreatingNewFolder } = getStoreMethods();

  setAddNewFolderName(defaultName);
  setIsCreatingNewFolder(true);
}

export function closeCreateFolder() {
  const { setAddNewFolderName, setCreatingFolder, setIsCreatingNewFolder } = getStoreMethods();

  setIsCreatingNewFolder(false);
  setAddNewFolderName("");
  setCreatingFolder(false);
}

export function setCreatingFolder(isCreating: boolean) {
  const { setCreatingFolder } = getStoreMethods();

  setCreatingFolder(isCreating);
}

export function openNewTextFile() {
  const { setAddNewTextFile } = getStoreMethods();

  setAddNewTextFile({ name: "", content: "" });
}

export function updateNewTextFileDraft(patch: Partial<NewTextFileDraft>) {
  const { setAddNewTextFile } = getStoreMethods();

  setAddNewTextFile((draft) => ({ name: "", content: "", ...draft, ...patch }));
}

export function closeNewTextFile() {
  const { setAddNewTextFile, setSavingTextFile } = getStoreMethods();

  setAddNewTextFile(null);
  setSavingTextFile(false);
}

export function setSavingTextFile(isSaving: boolean) {
  const { setSavingTextFile } = getStoreMethods();

  setSavingTextFile(isSaving);
}

export function openFilePreview(file: FileEntry) {
  const { setCurrentFile, setPreviewing, setSharing, setViewDetail } = getStoreMethods();

  setCurrentFile(file);
  setPreviewing(true);
  setSharing(false);
  setViewDetail(false);
}

export function closeFilePreview() {
  const { setCurrentFile, setPreviewing } = getStoreMethods();

  setPreviewing(false);
  setCurrentFile(null);
}

export function openFileDetails(file: FileEntry) {
  const { setCurrentFile, setPreviewing, setSharing, setViewDetail } = getStoreMethods();

  setCurrentFile(file);
  setPreviewing(false);
  setSharing(false);
  setViewDetail(true);
}

export function closeFileDetails() {
  const { setCurrentFile, setViewDetail } = getStoreMethods();

  setViewDetail(false);
  setCurrentFile(null);
}

export function openFileShare(file: FileEntry) {
  const { setCurrentFile, setPreviewing, setSharing, setViewDetail } = getStoreMethods();

  setCurrentFile(file);
  setPreviewing(false);
  setSharing(true);
  setViewDetail(false);
}

export function closeFileShare() {
  const { setCurrentFile, setSharing } = getStoreMethods();

  setSharing(false);
  setCurrentFile(null);
}

export function requestDeleteTarget(target: DeleteTarget) {
  const { setPendingDeleteTarget } = getStoreMethods();

  setPendingDeleteTarget(target);
}

export function closeDeleteTarget() {
  const { setPendingDeleteTarget } = getStoreMethods();

  setPendingDeleteTarget(null);
}

export function requestRenameTarget(target: RenameTarget) {
  const { setPendingRenameTarget } = getStoreMethods();

  setPendingRenameTarget(target);
}

export function closeRenameTarget() {
  const { setPendingRenameTarget } = getStoreMethods();

  setPendingRenameTarget(null);
}

export function requestMoveTarget(target: MoveTarget) {
  const { setPendingMoveTarget } = getStoreMethods();

  setPendingMoveTarget(target);
}

export function closeMoveTarget() {
  const { setPendingMoveTarget } = getStoreMethods();

  setPendingMoveTarget(null);
}

export function setDeletingFilePath(path: string | null) {
  const { setDeletingFilePath } = getStoreMethods();

  setDeletingFilePath(path);
}

export function setDeletingFolderPath(path: string | null) {
  const { setDeletingFolderPath } = getStoreMethods();

  setDeletingFolderPath(path);
}

export function setRenamingPath(path: string | null) {
  const { setRenamingPath } = getStoreMethods();

  setRenamingPath(path);
}

export function setMovingPath(path: string | null) {
  const { setMovingPath } = getStoreMethods();

  setMovingPath(path);
}

export function setDownloadingPath(path: string | null) {
  const { setDownloading, setDownloadingPath } = getStoreMethods();

  setDownloadingPath(path);
  setDownloading(Boolean(path));
}

export function openDirectoryStats(path: string) {
  const { setDirectoryStatsPath, setIsDirectoryStatsModalOpen } = getStoreMethods();

  setDirectoryStatsPath(path);
  setIsDirectoryStatsModalOpen(true);
}

export function closeDirectoryStats() {
  const { setIsDirectoryStatsModalOpen } = getStoreMethods();

  setIsDirectoryStatsModalOpen(false);
}

export function setUploadType(type: "file" | "folder" | "") {
  const { setUploadType } = getStoreMethods();

  setUploadType(type);
}

export function setUploadQueueItems(items: UploadQueueItem[]) {
  const { setUploadQueue } = getStoreMethods();

  setUploadQueue(items);
}

export function clearUploadQueueItems() {
  const { setIsUploadPanelMinimized, setUploadQueue } = getStoreMethods();

  setUploadQueue([]);
  setIsUploadPanelMinimized(false);
}

export function minimizeUploadPanel() {
  const { setIsUploadPanelMinimized } = getStoreMethods();

  setIsUploadPanelMinimized(true);
}

export function restoreUploadPanel() {
  const { setIsUploadPanelMinimized } = getStoreMethods();

  setIsUploadPanelMinimized(false);
}
