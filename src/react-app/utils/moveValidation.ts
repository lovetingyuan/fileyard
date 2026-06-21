import type { BatchOperationTarget, MoveTarget } from "../../types";

function getMoveParentPath(path: string): string {
  const separatorIndex = path.lastIndexOf("/");
  return separatorIndex === -1 ? "" : path.slice(0, separatorIndex);
}

function isFolderSelfOrDescendant(folderPath: string, targetParentPath: string): boolean {
  return targetParentPath === folderPath || targetParentPath.startsWith(`${folderPath}/`);
}

function isFolderStrictDescendant(folderPath: string, candidatePath: string): boolean {
  return candidatePath.startsWith(`${folderPath}/`);
}

export function isMoveDestinationHidden(destinationPath: string, target: MoveTarget): boolean {
  return target.type === "folder" && isFolderStrictDescendant(target.path, destinationPath);
}

export function isBatchMoveDestinationHidden(
  destinationPath: string,
  targets: BatchOperationTarget[],
): boolean {
  if (targets.some((target) => target.type === "folder" && target.path === destinationPath)) {
    return false;
  }

  return targets.some(
    (target) => target.type === "folder" && isFolderStrictDescendant(target.path, destinationPath),
  );
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

export function getBatchMoveDestinationDisabledReason(
  destinationPath: string,
  targets: BatchOperationTarget[],
): string | null {
  if (targets.some((target) => destinationPath === getMoveParentPath(target.path))) {
    return "当前位置";
  }

  if (
    targets.some(
      (target) =>
        target.type === "folder" && isFolderSelfOrDescendant(target.path, destinationPath),
    )
  ) {
    return "不能移动到自身或子文件夹";
  }

  return null;
}
