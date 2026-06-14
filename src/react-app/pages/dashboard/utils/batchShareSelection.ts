import type { BatchOperationTarget } from "../../../../types";

export function canShareDashboardSelection(targets: BatchOperationTarget[]): boolean {
  return (
    targets.length > 0 && targets.every((target) => target.type === "file" && !target.protectedBy)
  );
}

export function getDashboardSelectionShareDisabledReason(
  targets: BatchOperationTarget[],
): string | null {
  if (targets.length === 0) {
    return "请选择要分享的文件";
  }

  if (targets.some((target) => target.type === "folder")) {
    return "暂不支持分享文件夹";
  }

  if (targets.some((target) => target.protectedBy)) {
    return "加密目录下的文件不支持分享";
  }

  return null;
}
