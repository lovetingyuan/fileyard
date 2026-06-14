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
