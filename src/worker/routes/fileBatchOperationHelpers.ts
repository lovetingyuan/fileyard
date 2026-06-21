import type {
  BatchFileMutationResponse,
  BatchFileOperationResult,
  BatchOperationRequestTarget,
} from "../../types";
import { FilePathValidationError, normalizeRelativePath } from "../utils/fileManager";
import { getParentPath, isFolderMoveDestinationInvalid } from "./fileMoveHelpers";

type BatchAction = "delete" | "move";

function getBatchTargetKey(target: BatchOperationRequestTarget): string {
  return `${target.type}:${target.path}`;
}

function normalizeBatchTargetType(type: unknown): BatchOperationRequestTarget["type"] {
  if (type !== "file" && type !== "folder") {
    throw new FilePathValidationError("Target type must be file or folder");
  }

  return type;
}

function dedupeBatchTargets(
  targets: BatchOperationRequestTarget[],
): BatchOperationRequestTarget[] {
  const seenKeys = new Set<string>();
  const dedupedTargets: BatchOperationRequestTarget[] = [];

  for (const target of targets) {
    const key = getBatchTargetKey(target);
    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    dedupedTargets.push(target);
  }

  return dedupedTargets;
}

export function normalizeBatchTargets(value: unknown): BatchOperationRequestTarget[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new FilePathValidationError("Targets are required");
  }

  return dedupeBatchTargets(
    value.map((target) => {
      if (typeof target !== "object" || target === null) {
        throw new FilePathValidationError("Target must be an object");
      }

      const candidate = target as { path?: unknown; type?: unknown };
      if (typeof candidate.path !== "string") {
        throw new FilePathValidationError("Target path is required");
      }

      return {
        type: normalizeBatchTargetType(candidate.type),
        path: normalizeRelativePath(candidate.path, { allowEmpty: false, label: "Target path" }),
      };
    }),
  );
}

export function createBatchFileMutationResponse(
  action: BatchAction,
  results: BatchFileOperationResult[],
): BatchFileMutationResponse {
  const completedCount = results.filter((result) => result.success).length;
  const failedCount = results.length - completedCount;
  const itemLabel = results.length === 1 ? "item" : "items";
  const message =
    failedCount === 0
      ? `Batch ${action} completed`
      : completedCount === 0
        ? `Batch ${action} failed`
        : `${failedCount} of ${results.length} ${itemLabel} failed`;

  return {
    success: failedCount === 0,
    message,
    completedCount,
    failedCount,
    results,
  };
}

export function getBatchMutationStatus(response: BatchFileMutationResponse): 200 | 207 {
  return response.failedCount > 0 ? 207 : 200;
}

export function getBatchMoveValidationMessage(
  target: BatchOperationRequestTarget,
  targetParentPath: string,
): string | null {
  if (targetParentPath === getParentPath(target.path)) {
    return "Target folder must be different";
  }

  if (target.type === "folder" && isFolderMoveDestinationInvalid(target.path, targetParentPath)) {
    return "Cannot move folder into itself or a child folder";
  }

  return null;
}

export function createBatchFailureResult(
  target: BatchOperationRequestTarget,
  message: string,
): BatchFileOperationResult {
  return {
    type: target.type,
    path: target.path,
    success: false,
    message,
  };
}

export function createBatchSuccessResult(
  target: BatchOperationRequestTarget,
  message: string,
): BatchFileOperationResult {
  return {
    type: target.type,
    path: target.path,
    success: true,
    message,
  };
}
