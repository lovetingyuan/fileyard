import type { UploadQueueItem, UploadQueueStatus } from "../../types";

export const FILE_UPLOAD_BATCH_LIMIT_BYTES = 1024 * 1024 * 1024;
const EMPTY_FOLDER_UPLOAD_MESSAGE = "不允许上传空文件夹";
const ACTIVE_UPLOAD_STATUSES = new Set<UploadQueueStatus>(["queued", "preparing", "uploading"]);

export type UploadSelectionSource = "file" | "folder" | "clipboard";

type CreateUploadQueueItemsArgs = {
  files: Iterable<File>;
  currentPath: string;
  maxFileBytes: number;
  maxBatchBytes: number;
};

type FilterFilesAlreadyInUploadQueueArgs = {
  files: File[];
  currentPath: string;
  uploadQueue: UploadQueueItem[];
};

type FilterFilesAlreadyInUploadQueueResult = {
  acceptedFiles: File[];
  ignoredCount: number;
};

function normalizeSlashes(value: string): string {
  return value
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

function joinUploadPath(parentPath: string, childPath: string): string {
  const parent = normalizeSlashes(parentPath);
  const child = normalizeSlashes(childPath);
  if (!parent) {
    return child;
  }
  return child ? `${parent}/${child}` : parent;
}

function splitParentPath(path: string): { parentPath: string; name: string } {
  const segments = path.split("/");
  const name = segments.pop() ?? path;
  return {
    parentPath: segments.join("/"),
    name,
  };
}

function createItem(
  file: File,
  targetPath: string,
  status: UploadQueueStatus,
  errorMessage: string | null,
): UploadQueueItem {
  const { parentPath, name } = splitParentPath(targetPath);
  return {
    id: crypto.randomUUID(),
    file,
    displayPath: targetPath,
    targetPath,
    parentPath,
    name,
    size: file.size,
    progress: 0,
    status,
    errorMessage,
  };
}

function getUploadTargetPath(file: File, currentPath: string): string {
  const relativePath = normalizeSlashes(file.webkitRelativePath || file.name);
  return joinUploadPath(currentPath, relativePath || file.name);
}

export function filterFilesAlreadyInUploadQueue({
  files,
  currentPath,
  uploadQueue,
}: FilterFilesAlreadyInUploadQueueArgs): FilterFilesAlreadyInUploadQueueResult {
  const queuedTargetPaths = new Set(
    uploadQueue
      .filter((item) => ACTIVE_UPLOAD_STATUSES.has(item.status))
      .map((item) => item.targetPath),
  );
  const acceptedFiles: File[] = [];
  let ignoredCount = 0;

  for (const file of files) {
    if (queuedTargetPaths.has(getUploadTargetPath(file, currentPath))) {
      ignoredCount += 1;
    } else {
      acceptedFiles.push(file);
    }
  }

  return {
    acceptedFiles,
    ignoredCount,
  };
}

export function getUploadSelectionValidationMessage(
  files: FileList | File[],
  source: UploadSelectionSource,
): string | null {
  if (source === "folder" && files.length === 0) {
    return EMPTY_FOLDER_UPLOAD_MESSAGE;
  }
  return null;
}

export function createUploadQueueItems({
  files,
  currentPath,
  maxFileBytes,
  maxBatchBytes,
}: CreateUploadQueueItemsArgs): UploadQueueItem[] {
  const selectedFiles = [...files];
  const targetPaths = selectedFiles.map((file) => getUploadTargetPath(file, currentPath));
  const pathCounts = new Map<string, number>();
  let queuedBytes = 0;

  for (const targetPath of targetPaths) {
    pathCounts.set(targetPath, (pathCounts.get(targetPath) ?? 0) + 1);
  }

  return selectedFiles.map((file, index) => {
    const targetPath = targetPaths[index] ?? joinUploadPath(currentPath, file.name);
    if (file.size > maxFileBytes) {
      return createItem(file, targetPath, "oversized", "单个文件大小超过限制");
    }
    if ((pathCounts.get(targetPath) ?? 0) > 1) {
      return createItem(file, targetPath, "duplicate", "本次选择中存在重复路径");
    }
    if (queuedBytes + file.size > maxBatchBytes) {
      return createItem(file, targetPath, "oversized", "本次选择总大小超过 1GB 限制");
    }
    queuedBytes += file.size;
    return createItem(file, targetPath, "queued", null);
  });
}
