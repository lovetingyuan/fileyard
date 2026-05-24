import { beforeEach, describe, expect, it } from "vitest";
import type { FileEntry, User } from "../src/types";
import { getStoreMethods, getStateSnapshot, subscribeStore } from "../src/react-app/store";
import { clearAuthError, setAuthMutating, setAuthSessionState } from "../src/react-app/auth/actions";
import {
  clearDashboardSearch,
  closeCreateFolder,
  closeDeleteTarget,
  closeFileDetails,
  closeFilePreview,
  closeFileShare,
  closeNewTextFile,
  closeRenameTarget,
  openFileDetails,
  openFilePreview,
  openFileShare,
  openNewTextFile,
  requestDeleteTarget,
  requestRenameTarget,
  resetDashboardPathState,
  restoreUploadPanel,
  setDashboardSearchInput,
  setRenamingPath,
  setUploadQueueItems,
  startCreateFolder,
  toggleDashboardSort,
  updateNewTextFileDraft,
} from "../src/react-app/pages/dashboard/actions";

const user: User = {
  id: "user-1",
  email: "test1@tingyuan.in",
  image: null,
  name: "test1",
  verified: true,
};

const file: FileEntry = {
  name: "report.txt",
  path: "docs/report.txt",
  size: 12,
  createdAt: "2026-01-01T00:00:00.000Z",
  uploadedAt: "2026-01-02T00:00:00.000Z",
  contentType: "text/plain",
};

function resetStore() {
  const methods = getStoreMethods();

  methods.setUserInfo(null);
  methods.setAuthLoading(false);
  methods.setAuthMutating(false);
  methods.setAuthError(null);
  methods.setDashboardSortKey("uploadedAt");
  methods.setDashboardSortOrder("desc");
  methods.setSearchInputValue("");
  methods.setSearchKeyword("");
  methods.setIsCreatingNewFolder(false);
  methods.setCreatingFolder(false);
  methods.setAddNewFolderName("");
  methods.setAddNewTextFile(null);
  methods.setCurrentFile(null);
  methods.setPreviewing(false);
  methods.setSharing(false);
  methods.setViewDetail(false);
  methods.setPendingDeleteTarget(null);
  methods.setPendingRenameTarget(null);
  methods.setDownloadingPath(null);
  methods.setDeletingFilePath(null);
  methods.setDeletingFolderPath(null);
  methods.setRenamingPath(null);
  methods.setIsDirectoryStatsModalOpen(false);
  methods.setDirectoryStatsPath("");
  methods.setUploadType("");
  methods.setUploadQueue([]);
  methods.setIsUploadPanelMinimized(false);
}

describe("app store actions", () => {
  beforeEach(() => {
    resetStore();
  });

  it("stores Better Auth session status without replacing Better Auth as the source", () => {
    setAuthSessionState({ user, isLoading: true, error: new Error("Network error") });
    setAuthMutating(true);
    clearAuthError();

    const state = getStateSnapshot();

    expect(state.userInfo).toEqual(user);
    expect(state.authLoading).toBe(true);
    expect(state.authMutating).toBe(true);
    expect(state.authError).toBeNull();
  });

  it("does not publish a user change when the session user data is unchanged", () => {
    setAuthSessionState({ user, isLoading: false, error: null });

    const changedKeys: string[] = [];
    const unsubscribe = subscribeStore(({ key }) => {
      changedKeys.push(String(key));
    });

    try {
      setAuthSessionState({ user: { ...user }, isLoading: false, error: null });
    } finally {
      unsubscribe();
    }

    expect(changedKeys).not.toContain("userInfo");
    expect(getStateSnapshot().userInfo).toBe(user);
  });

  it("clears search state when the dashboard path changes and toggles sort order", () => {
    setDashboardSearchInput("docs");
    resetDashboardPathState();
    toggleDashboardSort("name");
    toggleDashboardSort("name");

    const state = getStateSnapshot();

    expect(state.searchInputValue).toBe("");
    expect(state.searchKeyword).toBe("");
    expect(state.dashboardSortKey).toBe("name");
    expect(state.dashboardSortOrder).toBe("desc");
  });

  it("tracks dashboard modals and the current file through store actions", () => {
    openFilePreview(file);
    closeFilePreview();
    openFileDetails(file);
    closeFileDetails();
    openFileShare(file);

    const state = getStateSnapshot();

    expect(state.currentFile).toEqual(file);
    expect(state.previewing).toBe(false);
    expect(state.viewDetail).toBe(false);
    expect(state.sharing).toBe(true);
  });

  it("tracks folder creation, text file draft, delete target, and upload panel state", () => {
    startCreateFolder("新建文件夹");
    closeCreateFolder();
    openNewTextFile();
    updateNewTextFileDraft({ name: "note.txt", content: "hello" });
    requestDeleteTarget({ type: "file", path: file.path, name: file.name });
    setUploadQueueItems([
      {
        id: "upload-1",
        file: new File(["hello"], "note.txt"),
        displayPath: "note.txt",
        targetPath: "note.txt",
        parentPath: "",
        name: "note.txt",
        size: 5,
        progress: 25,
        status: "uploading",
        errorMessage: null,
      },
    ]);
    restoreUploadPanel();

    const activeState = getStateSnapshot();

    expect(activeState.isCreatingNewFolder).toBe(false);
    expect(activeState.addNewFolderName).toBe("");
    expect(activeState.addNewTextFile).toEqual({ name: "note.txt", content: "hello" });
    expect(activeState.pendingDeleteTarget).toEqual({
      type: "file",
      path: file.path,
      name: file.name,
    });
    expect(activeState.uploadQueue).toHaveLength(1);
    expect(activeState.isUploadPanelMinimized).toBe(false);

    closeNewTextFile();
    closeDeleteTarget();
    expect(getStateSnapshot().addNewTextFile).toBeNull();
    expect(getStateSnapshot().pendingDeleteTarget).toBeNull();
  });

  it("tracks dashboard rename target and active renaming path", () => {
    requestRenameTarget({ type: "file", path: file.path, name: file.name });
    setRenamingPath(file.path);

    const activeState = getStateSnapshot();

    expect(activeState.pendingRenameTarget).toEqual({
      type: "file",
      path: file.path,
      name: file.name,
    });
    expect(activeState.renamingPath).toBe(file.path);

    closeRenameTarget();
    setRenamingPath(null);

    expect(getStateSnapshot().pendingRenameTarget).toBeNull();
    expect(getStateSnapshot().renamingPath).toBeNull();
  });

  it("can clear dashboard search explicitly", () => {
    setDashboardSearchInput("report");
    clearDashboardSearch();

    expect(getStateSnapshot().searchInputValue).toBe("");
    expect(getStateSnapshot().searchKeyword).toBe("");
  });
});
