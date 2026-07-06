import { getFolderUnlockTokenFromTokens } from "../../../utils/folderUnlockTokens";
import { cn } from "../../../utils/cn";

const DASHBOARD_TREE_SIDEBAR_OPEN_STORAGE_KEY = "dashboard-tree-sidebar-open";
export const DASHBOARD_TREE_DRAWER_ID = "dashboard-file-tree-drawer";

type DashboardTreeSidebarStorage = Pick<Storage, "getItem" | "setItem">;
type DashboardTreeSidebarMatchMedia = (query: string) => Pick<MediaQueryList, "matches">;

type TreeFolderProtectionState = {
  path: string;
  passwordProtected: boolean;
  protectedBy: string | null;
};

const DASHBOARD_TREE_DESKTOP_MEDIA_QUERY = "(min-width: 768px)";

function getDashboardTreeSidebarStorage(): DashboardTreeSidebarStorage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getDashboardTreeSidebarMatchMedia(): DashboardTreeSidebarMatchMedia | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia.bind(window);
}

export function getInitialDashboardTreeSidebarOpen(
  storage: DashboardTreeSidebarStorage | null = getDashboardTreeSidebarStorage(),
): boolean {
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(DASHBOARD_TREE_SIDEBAR_OPEN_STORAGE_KEY) === "open";
  } catch {
    return false;
  }
}

export function persistDashboardTreeSidebarOpen(
  isOpen: boolean,
  storage: DashboardTreeSidebarStorage | null = getDashboardTreeSidebarStorage(),
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(DASHBOARD_TREE_SIDEBAR_OPEN_STORAGE_KEY, isOpen ? "open" : "closed");
  } catch {
    return;
  }
}

export function shouldCloseDashboardTreeSidebarAfterNavigation(
  matchMedia: DashboardTreeSidebarMatchMedia | null = getDashboardTreeSidebarMatchMedia(),
): boolean {
  if (!matchMedia) {
    return false;
  }

  return !matchMedia(DASHBOARD_TREE_DESKTOP_MEDIA_QUERY).matches;
}

export function getDashboardTreeAutoOpenPaths(currentPath: string): string[] {
  if (!currentPath) {
    return [];
  }

  const segments = currentPath.split("/").filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

export function mergeDashboardTreeOpenPaths(
  openPaths: string[],
  autoOpenPaths: string[],
): string[] {
  const nextPaths = [...openPaths];
  const seenPaths = new Set(nextPaths);

  for (const path of autoOpenPaths) {
    if (!seenPaths.has(path)) {
      nextPaths.push(path);
      seenPaths.add(path);
    }
  }

  return nextPaths;
}

export function toggleDashboardTreeOpenPath(openPaths: string[], path: string): string[] {
  return openPaths.includes(path)
    ? openPaths.filter((openPath) => openPath !== path)
    : [...openPaths, path];
}

export function shouldLoadDashboardTreeFolderChildren(
  folder: TreeFolderProtectionState,
  folderUnlockTokens: Record<string, string>,
): boolean {
  if (!folder.passwordProtected && !folder.protectedBy) {
    return true;
  }

  return Boolean(getFolderUnlockTokenFromTokens(folderUnlockTokens, folder.path));
}

export function getDashboardTreeDrawerClassName(isOpen: boolean) {
  return cn(
    "drawer h-full min-h-0 shrink-0 transition-[width] duration-200 ease-in-out",
    isOpen ? "w-0 md:w-72 md:drawer-open" : "w-0",
  );
}
