import toast from "react-hot-toast";
import type { FolderTreeNode, FolderTreeResponse } from "../../../../types";
import { FILE_FOLDER_TREE_ENDPOINT } from "../../../hooks/filesApiUrls";
import { getStoreState } from "../../../store";
import { apiRequest } from "../../../utils/apiRequest";
import { getAllFolderUnlockHeaders } from "../../../utils/folderUnlockTokens";

export const FOLDER_SUBTREE_LOCKED_MESSAGE =
  "包含加密保护的子目录，需要先验证所有加密子目录再操作";
export const FOLDER_SET_PRIVATE_BLOCKED_BY_ENCRYPTED_CHILD_MESSAGE =
  "包含加密保护的子目录，当前不支持将父目录设为私密";
export const FOLDER_SUBTREE_PROTECTION_CHECK_FAILED_MESSAGE = "无法检查目录加密状态";

type FolderSubtreeTarget = {
  type: "file" | "folder";
  path: string;
};

function isDescendantFolder(path: string, folderPath: string): boolean {
  if (!folderPath) {
    return path !== "";
  }

  return path !== folderPath && path.startsWith(`${folderPath}/`);
}

export function hasExactFolderUnlockToken(
  folderUnlockTokens: Record<string, string>,
  path: string,
) {
  return Object.prototype.hasOwnProperty.call(folderUnlockTokens, path);
}

export function findUnverifiedEncryptedDescendant(
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
    const blockedNode = findUnverifiedEncryptedDescendant(
      child,
      folderPath,
      folderUnlockTokens,
    );
    if (blockedNode) {
      return blockedNode;
    }
  }

  return null;
}

export function findEncryptedDescendant(
  node: FolderTreeNode,
  folderPath: string,
): FolderTreeNode | null {
  if (isDescendantFolder(node.path, folderPath) && node.passwordProtected) {
    return node;
  }

  for (const child of node.children) {
    const blockedNode = findEncryptedDescendant(child, folderPath);
    if (blockedNode) {
      return blockedNode;
    }
  }

  return null;
}

function getFolderTargets(targets: FolderSubtreeTarget[]) {
  return targets.filter((target) => target.type === "folder");
}

async function fetchFolderTreeRoot(): Promise<FolderTreeNode> {
  const response = await apiRequest<FolderTreeResponse>(FILE_FOLDER_TREE_ENDPOINT, {
    headers: getAllFolderUnlockHeaders(),
  });

  return response.root;
}

export function findFirstUnverifiedEncryptedDescendantForTargets(
  root: FolderTreeNode,
  targets: FolderSubtreeTarget[],
  folderUnlockTokens: Record<string, string>,
): FolderTreeNode | null {
  for (const target of getFolderTargets(targets)) {
    const blockedNode = findUnverifiedEncryptedDescendant(
      root,
      target.path,
      folderUnlockTokens,
    );
    if (blockedNode) {
      return blockedNode;
    }
  }

  return null;
}

export function findFirstEncryptedDescendantForTargets(
  root: FolderTreeNode,
  targets: FolderSubtreeTarget[],
): FolderTreeNode | null {
  for (const target of getFolderTargets(targets)) {
    const blockedNode = findEncryptedDescendant(root, target.path);
    if (blockedNode) {
      return blockedNode;
    }
  }

  return null;
}

export async function ensureFolderSubtreesUnlockedBeforeOperation(
  targets: FolderSubtreeTarget[],
): Promise<boolean> {
  if (getFolderTargets(targets).length === 0) {
    return true;
  }

  try {
    const root = await fetchFolderTreeRoot();
    const blockedNode = findFirstUnverifiedEncryptedDescendantForTargets(
      root,
      targets,
      getStoreState().folderUnlockTokens,
    );
    if (blockedNode) {
      toast.error(FOLDER_SUBTREE_LOCKED_MESSAGE);
      return false;
    }

    return true;
  } catch {
    toast.error(FOLDER_SUBTREE_PROTECTION_CHECK_FAILED_MESSAGE);
    return false;
  }
}

export async function ensureFolderHasNoEncryptedDescendantsBeforeSetPrivate(
  folderPath: string,
): Promise<boolean> {
  try {
    const root = await fetchFolderTreeRoot();
    const blockedNode = findEncryptedDescendant(root, folderPath);
    if (blockedNode) {
      toast.error(FOLDER_SET_PRIVATE_BLOCKED_BY_ENCRYPTED_CHILD_MESSAGE);
      return false;
    }

    return true;
  } catch {
    toast.error(FOLDER_SUBTREE_PROTECTION_CHECK_FAILED_MESSAGE);
    return false;
  }
}
