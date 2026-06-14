import type { BatchOperationTarget } from "../../../../types";

export const ENCRYPTED_FOLDER_BATCH_DELETE_MESSAGE = "暂不支持批量删除操作包含加密目录";

export function getBatchDeleteBlockedReason(targets: BatchOperationTarget[]): string | null {
  return targets.some((target) => target.type === "folder" && target.passwordProtected)
    ? ENCRYPTED_FOLDER_BATCH_DELETE_MESSAGE
    : null;
}
