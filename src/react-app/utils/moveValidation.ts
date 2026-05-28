import type { MoveTarget } from "../../types";

export function getMoveParentPath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

export function isFolderSelfOrDescendant(folderPath: string, targetParentPath: string): boolean {
  return targetParentPath === folderPath || targetParentPath.startsWith(`${folderPath}/`);
}

export function getMoveDestinationDisabledReason(
  destinationPath: string,
  target: MoveTarget,
): string | null {
  if (destinationPath === getMoveParentPath(target.path)) {
    return "当前位置";
  }

  if (target.type === "folder" && isFolderSelfOrDescendant(target.path, destinationPath)) {
    return "不能移动到自身或子文件夹";
  }

  return null;
}
