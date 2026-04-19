import type { UploadQueueItem, UploadQueueStatus } from "../../types";

export const FILE_UPLOAD_BATCH_LIMIT_BYTES = 1024 * 1024 * 1024;

type CreateUploadQueueItemsArgs = {
  files: Iterable<File>;
  currentPath: string;
  maxFileBytes: number;
  maxBatchBytes: number;
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

export function createUploadQueueItems({
  files,
  currentPath,
  maxFileBytes,
  maxBatchBytes,
}: CreateUploadQueueItemsArgs): UploadQueueItem[] {
  const selectedFiles = [...files];
  const totalBytes = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const batchIsOversized = totalBytes > maxBatchBytes;
  const targetPaths = selectedFiles.map((file) => {
    const relativePath = normalizeSlashes(file.webkitRelativePath || file.name);
    return joinUploadPath(currentPath, relativePath || file.name);
  });
  const pathCounts = new Map<string, number>();

  for (const targetPath of targetPaths) {
    pathCounts.set(targetPath, (pathCounts.get(targetPath) ?? 0) + 1);
  }

  return selectedFiles.map((file, index) => {
    const targetPath = targetPaths[index] ?? joinUploadPath(currentPath, file.name);
    if (batchIsOversized) {
      return createItem(file, targetPath, "oversized", "本次选择总大小超过 1GB 限制");
    }
    if (file.size > maxFileBytes) {
      return createItem(file, targetPath, "oversized", "单个文件大小超过限制");
    }
    if ((pathCounts.get(targetPath) ?? 0) > 1) {
      return createItem(file, targetPath, "duplicate", "本次选择中存在重复路径");
    }
    return createItem(file, targetPath, "queued", null);
  });
}
