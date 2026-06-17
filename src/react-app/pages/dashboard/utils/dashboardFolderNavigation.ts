import type { FolderEntry, FolderPasswordModalTarget } from "../../../../types";
import { getFolderUnlockTokenFromTokens } from "../../../utils/folderUnlockTokens";

type DashboardFolderNavigationState = Pick<
  FolderEntry,
  "name" | "path" | "passwordProtected" | "protectedBy"
>;

export type DashboardFolderOpenAction =
  | {
      type: "navigate";
      path: string;
    }
  | {
      type: "unlock";
      target: FolderPasswordModalTarget;
    };

function getParentPath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

function getBaseName(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 1] ?? path;
}

function isPathWithinFolder(path: string, folderPath: string): boolean {
  return path === folderPath || path.startsWith(`${folderPath}/`);
}

export function getDashboardFolderOpenAction(
  folder: DashboardFolderNavigationState,
  folderUnlockTokens: Record<string, string>,
): DashboardFolderOpenAction {
  if (
    (!folder.passwordProtected && !folder.protectedBy) ||
    getFolderUnlockTokenFromTokens(folderUnlockTokens, folder.path)
  ) {
    return { type: "navigate", path: folder.path };
  }

  return {
    type: "unlock",
    target: {
      mode: "unlock",
      path: folder.path,
      name: folder.name,
      protectedPath: folder.protectedBy ?? folder.path,
    },
  };
}

export function getDashboardLockedPathTarget({
  currentPath,
  lockedProtectedPath,
}: {
  currentPath: string;
  lockedProtectedPath: string;
}): FolderPasswordModalTarget | null {
  if (!isPathWithinFolder(currentPath, lockedProtectedPath)) {
    return null;
  }

  return {
    mode: "unlock",
    path: currentPath,
    name: getBaseName(lockedProtectedPath),
    protectedPath: lockedProtectedPath,
    returnPath: getParentPath(lockedProtectedPath),
  };
}
