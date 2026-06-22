import toast from "react-hot-toast";
import type { FolderTreeNode, FolderTreeResponse, MoveTarget } from "../../../../types";
import { FILE_FOLDER_TREE_ENDPOINT } from "../../../hooks/filesApiUrls";
import { getStoreState } from "../../../store";
import { apiRequest } from "../../../utils/apiRequest";
import { getAllFolderUnlockHeaders } from "../../../utils/folderUnlockTokens";
import { requestMoveTarget } from "../actions";

const FOLDER_MOVE_BLOCKED_BY_LOCKED_CHILD_MESSAGE =
  "目录内包含未验证的加密目录，请先验证后再移动";

function isDescendantFolder(path: string, folderPath: string): boolean {
  if (!folderPath) {
    return path !== "";
  }

  return path !== folderPath && path.startsWith(`${folderPath}/`);
}

function hasExactFolderUnlockToken(folderUnlockTokens: Record<string, string>, path: string) {
  return Object.prototype.hasOwnProperty.call(folderUnlockTokens, path);
}

function findUnverifiedEncryptedDescendant(
  node: FolderTreeNode,
  folderPath: string,
  folderUnlockTokens: Record<string, string>,
): FolderTreeNode | null {
  if (
    isDescendantFolder(node.path, folderPath) &&
    node.passwordProtected &&
    !hasExactFolderUnlockToken(folderUnlockTokens, node.path)
  ) {
    return node;
  }

  for (const child of node.children) {
    const blockedNode = findUnverifiedEncryptedDescendant(child, folderPath, folderUnlockTokens);
    if (blockedNode) {
      return blockedNode;
    }
  }

  return null;
}

export async function requestMoveTargetWithFolderPreflight(target: MoveTarget) {
  if (target.type !== "folder") {
    requestMoveTarget(target);
    return;
  }

  try {
    const response = await apiRequest<FolderTreeResponse>(FILE_FOLDER_TREE_ENDPOINT, {
      headers: getAllFolderUnlockHeaders(),
    });
    const blockedFolder = findUnverifiedEncryptedDescendant(
      response.root,
      target.path,
      getStoreState().folderUnlockTokens,
    );

    if (blockedFolder) {
      toast.error(FOLDER_MOVE_BLOCKED_BY_LOCKED_CHILD_MESSAGE);
      return;
    }

    requestMoveTarget(target);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "无法检查目录加密状态");
  }
}
