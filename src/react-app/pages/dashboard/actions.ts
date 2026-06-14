import type {
  BatchFileOperationResult,
  BatchOperationTarget,
  DashboardLayoutMode,
  DeleteTarget,
  FileEntry,
  FileOperationTarget,
  FolderPasswordModalTarget,
  MoveTarget,
  NewTextFileDraft,
  RenameTarget,
  SortKey,
  UploadQueueItem,
} from "../../../types";
import { getStoreMethods } from "../../store";
import {
  getNextDashboardLayoutMode,
  persistDashboardLayoutMode,
} from "./utils/dashboardLayoutMode";
import {
  getDashboardSelectionKey,
  getNextDashboardSelection,
  getNextDashboardSelectAllSelection,
} from "./utils/dashboardSelectionRange";

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
  clearDashboardSelection();
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
  persistDashboardLayoutMode(mode);
}

export function toggleDashboardLayoutMode() {
  const { getDashboardLayoutMode } = getStoreMethods();

  setDashboardLayoutMode(getNextDashboardLayoutMode(getDashboardLayoutMode()));
}

export function setDashboardTreeSidebarOpen(isOpen: boolean) {
  const { setIsDashboardTreeSidebarOpen } = getStoreMethods();

  setIsDashboardTreeSidebarOpen(isOpen);
}

export function toggleDashboardTreeSidebar() {
  const { getIsDashboardTreeSidebarOpen, setIsDashboardTreeSidebarOpen } = getStoreMethods();

  setIsDashboardTreeSidebarOpen(!getIsDashboardTreeSidebarOpen());
}

export function requestDashboardFileLocation(filePath: string) {
  const {
    setCurrentFile,
    setDashboardLocatedFilePath,
    setIsDashboardTreeSidebarOpen,
    setPreviewing,
    setShareTargets,
    setSharing,
    setViewDetail,
  } = getStoreMethods();

  setDashboardLocatedFilePath(filePath);
  setIsDashboardTreeSidebarOpen(false);
  setCurrentFile(null);
  setPreviewing(false);
  setShareTargets([]);
  setSharing(false);
  setViewDetail(false);
}

export function clearDashboardLocatedFilePath(filePath: string) {
  const { getDashboardLocatedFilePath, setDashboardLocatedFilePath } = getStoreMethods();

  if (getDashboardLocatedFilePath() === filePath) {
    setDashboardLocatedFilePath(null);
  }
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
  const { setCurrentFile, setPreviewing, setShareTargets, setSharing, setViewDetail } =
    getStoreMethods();

  setCurrentFile(file);
  setPreviewing(true);
  setShareTargets([]);
  setSharing(false);
  setViewDetail(false);
}

export function closeFilePreview() {
  const { setCurrentFile, setPreviewing } = getStoreMethods();

  setPreviewing(false);
  setCurrentFile(null);
}

export function openFileDetails(file: FileEntry) {
  const { setCurrentFile, setPreviewing, setShareTargets, setSharing, setViewDetail } =
    getStoreMethods();

  setCurrentFile(file);
  setPreviewing(false);
  setShareTargets([]);
  setSharing(false);
  setViewDetail(true);
}

export function closeFileDetails() {
  const { setCurrentFile, setViewDetail } = getStoreMethods();

  setViewDetail(false);
  setCurrentFile(null);
}

export function openFileShare(file: FileEntry) {
  const { setCurrentFile, setPreviewing, setShareTargets, setSharing, setViewDetail } =
    getStoreMethods();

  setCurrentFile(file);
  setPreviewing(false);
  setShareTargets([{ path: file.path, name: file.name }]);
  setSharing(true);
  setViewDetail(false);
}

export function openBatchFileShare(files: FileOperationTarget[]) {
  const { setCurrentFile, setPreviewing, setShareTargets, setSharing, setViewDetail } =
    getStoreMethods();

  setCurrentFile(null);
  setPreviewing(false);
  setShareTargets(files);
  setSharing(files.length > 0);
  setViewDetail(false);
}

export function closeFileShare() {
  const { setCurrentFile, setShareTargets, setSharing } = getStoreMethods();

  setSharing(false);
  setShareTargets([]);
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

function isSameFileOperationTarget(
  current: DeleteTarget | RenameTarget | null | undefined,
  next: DeleteTarget | RenameTarget | null | undefined,
) {
  if (!current || !next) {
    return current === next;
  }

  return current.type === next.type && current.name === next.name && current.path === next.path;
}

function isSameAfterUnlockAction(
  current: FolderPasswordModalTarget["afterUnlock"],
  next: FolderPasswordModalTarget["afterUnlock"],
) {
  if (!current || !next) {
    return current === next;
  }

  return current.type === next.type && isSameFileOperationTarget(current.target, next.target);
}

function isSameFolderPasswordTarget(
  current: FolderPasswordModalTarget | null,
  next: FolderPasswordModalTarget,
) {
  return (
    current?.mode === next.mode &&
    current.path === next.path &&
    current.name === next.name &&
    current.protectedPath === next.protectedPath &&
    current.returnPath === next.returnPath &&
    isSameAfterUnlockAction(current.afterUnlock, next.afterUnlock)
  );
}

export function openFolderPasswordModal(target: FolderPasswordModalTarget) {
  const { getPendingFolderPasswordTarget, setPendingFolderPasswordTarget } = getStoreMethods();

  if (isSameFolderPasswordTarget(getPendingFolderPasswordTarget(), target)) {
    return;
  }

  setPendingFolderPasswordTarget(target);
}

export function closeFolderPasswordModal() {
  const { setPendingFolderPasswordTarget } = getStoreMethods();

  setPendingFolderPasswordTarget(null);
}

export function saveFolderUnlockToken(protectedPath: string, unlockToken: string) {
  const { setFolderUnlockTokens } = getStoreMethods();

  setFolderUnlockTokens((tokens) => ({
    ...tokens,
    [protectedPath]: unlockToken,
  }));
}

type DashboardSelectionOptions = {
  isRangeSelection?: boolean;
  visibleTargets?: BatchOperationTarget[];
};

export function toggleDashboardSelection(
  target: BatchOperationTarget,
  options: DashboardSelectionOptions = {},
) {
  const {
    getDashboardSelectionAnchorKey,
    getSelectedDashboardTargets,
    setDashboardSelectionAnchorKey,
    setPendingBatchDeleteTargets,
    setPendingBatchMoveTargets,
    setSelectedDashboardTargets,
  } = getStoreMethods();
  const result = getNextDashboardSelection({
    anchorKey: getDashboardSelectionAnchorKey(),
    isRangeSelection: options.isRangeSelection ?? false,
    selectedTargets: getSelectedDashboardTargets(),
    target,
    visibleTargets: options.visibleTargets ?? [],
  });
  const nextTargets = result.selectedTargets;

  setSelectedDashboardTargets(nextTargets);
  setDashboardSelectionAnchorKey(result.anchorKey);
  if (nextTargets.length === 0) {
    setPendingBatchDeleteTargets(null);
    setPendingBatchMoveTargets(null);
  }
}

export function toggleDashboardSelectAll(visibleTargets: BatchOperationTarget[]) {
  if (visibleTargets.length === 0) {
    return;
  }

  const {
    getDashboardSelectionAnchorKey,
    getSelectedDashboardTargets,
    setDashboardSelectionAnchorKey,
    setPendingBatchDeleteTargets,
    setPendingBatchMoveTargets,
    setSelectedDashboardTargets,
  } = getStoreMethods();
  const result = getNextDashboardSelectAllSelection({
    anchorKey: getDashboardSelectionAnchorKey(),
    selectedTargets: getSelectedDashboardTargets(),
    visibleTargets,
  });
  const nextTargets = result.selectedTargets;

  setSelectedDashboardTargets(nextTargets);
  setDashboardSelectionAnchorKey(result.anchorKey);
  if (nextTargets.length === 0) {
    setPendingBatchDeleteTargets(null);
    setPendingBatchMoveTargets(null);
  }
}

export function clearDashboardSelection() {
  const {
    setBatchDeleting,
    setBatchMoving,
    setDashboardSelectionAnchorKey,
    setPendingBatchDeleteTargets,
    setPendingBatchMoveTargets,
    setSelectedDashboardTargets,
  } = getStoreMethods();

  setSelectedDashboardTargets([]);
  setDashboardSelectionAnchorKey(null);
  setPendingBatchDeleteTargets(null);
  setPendingBatchMoveTargets(null);
  setBatchDeleting(false);
  setBatchMoving(false);
}

export function requestBatchDeleteTargets() {
  const { getSelectedDashboardTargets, setPendingBatchDeleteTargets } = getStoreMethods();
  const targets = getSelectedDashboardTargets();

  if (targets.length > 0) {
    setPendingBatchDeleteTargets(targets);
  }
}

export function closeBatchDeleteTargets() {
  const { setBatchDeleting, setPendingBatchDeleteTargets } = getStoreMethods();

  setPendingBatchDeleteTargets(null);
  setBatchDeleting(false);
}

export function requestBatchMoveTargets() {
  const { getSelectedDashboardTargets, setPendingBatchMoveTargets } = getStoreMethods();
  const targets = getSelectedDashboardTargets();

  if (targets.length > 0) {
    setPendingBatchMoveTargets(targets);
  }
}

export function closeBatchMoveTargets() {
  const { setBatchMoving, setPendingBatchMoveTargets } = getStoreMethods();

  setPendingBatchMoveTargets(null);
  setBatchMoving(false);
}

export function setBatchDeleting(isDeleting: boolean) {
  const { setBatchDeleting } = getStoreMethods();

  setBatchDeleting(isDeleting);
}

export function setBatchMoving(isMoving: boolean) {
  const { setBatchMoving } = getStoreMethods();

  setBatchMoving(isMoving);
}

export function replaceDashboardSelectionWithFailedResults(
  sourceTargets: BatchOperationTarget[],
  results: BatchFileOperationResult[],
) {
  const {
    setDashboardSelectionAnchorKey,
    getPendingBatchDeleteTargets,
    getPendingBatchMoveTargets,
    setPendingBatchDeleteTargets,
    setPendingBatchMoveTargets,
    setSelectedDashboardTargets,
  } = getStoreMethods();
  const sourceTargetsByKey = new Map(
    sourceTargets.map((target) => [getDashboardSelectionKey(target), target]),
  );
  const failedTargets = results
    .filter((result) => !result.success)
    .map((result) => sourceTargetsByKey.get(getDashboardSelectionKey(result)))
    .filter((target): target is BatchOperationTarget => Boolean(target));

  setSelectedDashboardTargets(failedTargets);
  setDashboardSelectionAnchorKey(
    failedTargets.length > 0 ? getDashboardSelectionKey(failedTargets[0]) : null,
  );
  if (getPendingBatchDeleteTargets()) {
    setPendingBatchDeleteTargets(failedTargets.length > 0 ? failedTargets : null);
  }
  if (getPendingBatchMoveTargets()) {
    setPendingBatchMoveTargets(failedTargets.length > 0 ? failedTargets : null);
  }
  if (failedTargets.length === 0) {
    clearDashboardSelection();
  }
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
