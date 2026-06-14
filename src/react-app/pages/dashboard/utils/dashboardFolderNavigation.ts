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

export type DashboardLockedPathAction =
  | {
      type: "ignore";
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

export function getDashboardLockedPathAction({
  currentPath,
  lockedProtectedPath,
  pendingTarget,
}: {
  currentPath: string;
  lockedProtectedPath: string;
  pendingTarget: FolderPasswordModalTarget | null;
}): DashboardLockedPathAction {
  const target: FolderPasswordModalTarget = {
    mode: "unlock",
    path: currentPath,
    name: getBaseName(lockedProtectedPath),
    protectedPath: lockedProtectedPath,
    returnPath: getParentPath(lockedProtectedPath),
  };

  if (
    pendingTarget?.mode === target.mode &&
    pendingTarget.path === target.path &&
    pendingTarget.protectedPath === target.protectedPath &&
    pendingTarget.returnPath === target.returnPath &&
    !pendingTarget.afterUnlock
  ) {
    return { type: "ignore" };
  }

  return { type: "unlock", target };
}
