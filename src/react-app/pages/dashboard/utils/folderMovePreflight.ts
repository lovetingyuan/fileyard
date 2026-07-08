import type { MoveTarget } from "../../../../types";
import { requestMoveTarget } from "../actions";
import { ensureFolderSubtreesUnlockedBeforeOperation } from "./folderSubtreeProtectionPreflight";

export async function requestMoveTargetWithFolderPreflight(target: MoveTarget) {
  if (target.type !== "folder") {
    requestMoveTarget(target);
    return;
  }

  if (await ensureFolderSubtreesUnlockedBeforeOperation([target])) {
    requestMoveTarget(target);
  }
}
