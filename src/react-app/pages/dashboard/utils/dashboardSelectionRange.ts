import type { BatchOperationTarget, FileEntry, FolderEntry } from "../../../../types";

type DashboardSelectionArgs = {
  anchorKey: string | null;
  isRangeSelection: boolean;
  selectedTargets: BatchOperationTarget[];
  target: BatchOperationTarget;
  visibleTargets: BatchOperationTarget[];
};

type DashboardSelectionResult = {
  anchorKey: string | null;
  selectedTargets: BatchOperationTarget[];
};

export function getDashboardSelectionKey(target: Pick<BatchOperationTarget, "path" | "type">) {
  return `${target.type}:${target.path}`;
}

export function createDashboardSelectionTargets<
  TFolder extends Pick<FolderEntry, "name" | "path">,
  TFile extends Pick<FileEntry, "name" | "path">,
>(folders: TFolder[], files: TFile[]): BatchOperationTarget[] {
  return [
    ...folders.map((folder) => ({
      type: "folder" as const,
      path: folder.path,
      name: folder.name,
    })),
    ...files.map((file) => ({
      type: "file" as const,
      path: file.path,
      name: file.name,
    })),
  ];
}

function toggleTarget(
  selectedTargets: BatchOperationTarget[],
  target: BatchOperationTarget,
): DashboardSelectionResult {
  const targetKey = getDashboardSelectionKey(target);
  const nextTargets = selectedTargets.some(
    (selectedTarget) => getDashboardSelectionKey(selectedTarget) === targetKey,
  )
    ? selectedTargets.filter(
        (selectedTarget) => getDashboardSelectionKey(selectedTarget) !== targetKey,
      )
    : [...selectedTargets, target];

  return {
    selectedTargets: nextTargets,
    anchorKey: nextTargets.length > 0 ? targetKey : null,
  };
}

export function getNextDashboardSelection({
  anchorKey,
  isRangeSelection,
  selectedTargets,
  target,
  visibleTargets,
}: DashboardSelectionArgs): DashboardSelectionResult {
  const targetKey = getDashboardSelectionKey(target);

  if (!isRangeSelection || !anchorKey) {
    return toggleTarget(selectedTargets, target);
  }

  const anchorIndex = visibleTargets.findIndex(
    (visibleTarget) => getDashboardSelectionKey(visibleTarget) === anchorKey,
  );
  const targetIndex = visibleTargets.findIndex(
    (visibleTarget) => getDashboardSelectionKey(visibleTarget) === targetKey,
  );

  if (anchorIndex === -1 || targetIndex === -1) {
    return toggleTarget(selectedTargets, target);
  }

  const startIndex = Math.min(anchorIndex, targetIndex);
  const endIndex = Math.max(anchorIndex, targetIndex);

  return {
    selectedTargets: visibleTargets.slice(startIndex, endIndex + 1),
    anchorKey,
  };
}
