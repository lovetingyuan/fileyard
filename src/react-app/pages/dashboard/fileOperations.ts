import toast from "react-hot-toast";
import type {
  BatchOperationTarget,
  CreateArchiveDownloadRequest,
  CreateArchiveDownloadResponse,
} from "../../../types";
import { buildDownloadUrl, FILE_ARCHIVE_DOWNLOADS_ENDPOINT } from "../../hooks/useFilesApi";
import { ApiError, apiRequest } from "../../utils/apiRequest";
import {
  getFolderUnlockHeadersForPaths,
  getFolderUnlockTokenForPath,
} from "../../utils/folderUnlockTokens";
import { openFolderPasswordModal, setDownloadingPath } from "./actions";
import { ensureFolderSubtreesUnlockedBeforeOperation } from "./utils/folderSubtreeProtectionPreflight";

const LARGE_FILE_UPLOAD_THRESHOLD_BYTES = 20 * 1024 * 1024;

export async function runWithLargeFileUploadToast<T>(file: File, action: () => Promise<T>) {
  const waitingToastId =
    file.size >= LARGE_FILE_UPLOAD_THRESHOLD_BYTES
      ? toast.loading("Large file, please wait")
      : undefined;

  try {
    return await action();
  } finally {
    if (waitingToastId) {
      toast.dismiss(waitingToastId);
    }
  }
}

function triggerBrowserDownload(downloadUrl: string, fileName: string) {
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
}

export async function downloadDashboardFile(path: string, fallbackName: string) {
  try {
    setDownloadingPath(path);
    const downloadUrl = buildDownloadUrl(path, getFolderUnlockTokenForPath(path));
    const response = await fetch(downloadUrl, {
      credentials: "include",
      method: "HEAD",
    });
    if (!response.ok) {
      throw new Error("Failed to download file");
    }

    triggerBrowserDownload(downloadUrl, fallbackName);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Failed to download file");
  } finally {
    setDownloadingPath(null);
  }
}

function getArchiveProtectedPath(target: BatchOperationTarget): string | null {
  if (target.protectedBy) {
    return target.protectedBy;
  }

  return target.type === "folder" && target.passwordProtected ? target.path : null;
}

function getLockedArchiveTarget(targets: BatchOperationTarget[]) {
  for (const target of targets) {
    const protectedPath = getArchiveProtectedPath(target);
    if (protectedPath && !getFolderUnlockTokenForPath(target.path)) {
      return { target, protectedPath };
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getFolderLockedProtectedPath(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 423 || !isRecord(error.data)) {
    return null;
  }

  return error.data.code === "folder_locked" && typeof error.data.protectedPath === "string"
    ? error.data.protectedPath
    : null;
}

function getNameFromPath(path: string): string {
  const segments = path.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? path;
}

export function getDashboardArchiveFallbackName(targets: BatchOperationTarget[]): string {
  if (targets.length === 1) {
    return `${targets[0]?.name ?? "download"}.zip`;
  }

  return "fileyard-download.zip";
}

export async function downloadDashboardArchive(
  targets: BatchOperationTarget[],
  fallbackName = getDashboardArchiveFallbackName(targets),
) {
  if (targets.length === 0) {
    return;
  }

  if (!(await ensureFolderSubtreesUnlockedBeforeOperation(targets))) {
    return;
  }

  const lockedTarget = getLockedArchiveTarget(targets);
  if (lockedTarget) {
    openFolderPasswordModal({
      mode: "unlock",
      path: lockedTarget.target.path,
      name: lockedTarget.target.name,
      protectedPath: lockedTarget.protectedPath,
      afterUnlock: { type: "download", targets },
    });
    return;
  }

  const requestTargets = targets.map((target) => ({
    type: target.type,
    path: target.path,
  }));
  const downloadingPath = targets.length === 1 ? targets[0]?.path : "__archive-download__";

  try {
    setDownloadingPath(downloadingPath ?? "__archive-download__");
    const response = await apiRequest<CreateArchiveDownloadResponse>(
      FILE_ARCHIVE_DOWNLOADS_ENDPOINT,
      {
        method: "POST",
        headers: getFolderUnlockHeadersForPaths(targets.map((target) => target.path)),
        body: JSON.stringify({
          targets: requestTargets,
        } satisfies CreateArchiveDownloadRequest),
      },
    );

    triggerBrowserDownload(response.downloadUrl, response.fileName || fallbackName);
  } catch (error) {
    const protectedPath = getFolderLockedProtectedPath(error);
    if (protectedPath) {
      openFolderPasswordModal({
        mode: "unlock",
        path: protectedPath,
        name: getNameFromPath(protectedPath),
        protectedPath,
        afterUnlock: { type: "download", targets },
      });
      return;
    }

    toast.error(error instanceof Error ? error.message : "Failed to download archive");
  } finally {
    setDownloadingPath(null);
  }
}
