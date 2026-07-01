import type {
  FolderEntry,
  FolderPasswordAfterUnlockAction,
  FolderPasswordModalTarget,
} from "../../../../types";
import { getFolderUnlockTokenFromTokens } from "../../../utils/folderUnlockTokens";

type ProtectedFolderOperation = "delete" | "download" | "move" | "rename";
type FolderMutationTarget = {
  type: "folder";
  path: string;
  name: string;
};

type ProtectedFolderOperationAction =
  | {
      type: "request";
      target: FolderMutationTarget;
    }
  | {
      type: "unlock";
      target: FolderPasswordModalTarget;
    };

function getAfterUnlockAction(
  operation: ProtectedFolderOperation,
  target: FolderMutationTarget,
): FolderPasswordAfterUnlockAction {
  if (operation === "download") {
    return { type: "download", targets: [target] };
  }

  if (operation === "rename") {
    return { type: "rename", target };
  }

  if (operation === "move") {
    return { type: "move", target };
  }

  return { type: "delete", target };
}

export function getProtectedFolderOperationAction({
  folder,
  folderUnlockTokens,
  operation,
}: {
  folder: Pick<FolderEntry, "name" | "passwordProtected" | "path" | "protectedBy">;
  folderUnlockTokens: Record<string, string>;
  operation: ProtectedFolderOperation;
}): ProtectedFolderOperationAction {
  const target: FolderMutationTarget = {
    type: "folder",
    path: folder.path,
    name: folder.name,
  };

  if (
    (!folder.passwordProtected && !folder.protectedBy) ||
    getFolderUnlockTokenFromTokens(folderUnlockTokens, folder.path)
  ) {
    return { type: "request", target };
  }

  return {
    type: "unlock",
    target: {
      mode: "unlock",
      path: folder.path,
      name: folder.name,
      protectedPath: folder.protectedBy ?? folder.path,
      afterUnlock: getAfterUnlockAction(operation, target),
    },
  };
}
