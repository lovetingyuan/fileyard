import type { CreateShareLinkRequest } from "../../types";
import { FilePathValidationError } from "../utils/fileManager";
import { MAX_SHARE_FILE_COUNT } from "../utils/shareLinks";

export function getCreateShareLinkPaths(body: CreateShareLinkRequest): string[] {
  const paths = body.paths ?? (body.path ? [body.path] : []);

  if (paths.length === 0) {
    throw new FilePathValidationError("At least one file is required");
  }

  if (paths.length > MAX_SHARE_FILE_COUNT) {
    throw new FilePathValidationError(`Cannot share more than ${MAX_SHARE_FILE_COUNT} files`);
  }

  if (new Set(paths).size !== paths.length) {
    throw new FilePathValidationError("File paths must be unique");
  }

  return paths;
}

export function parseShareDownloadFileIndex(value: string | undefined, fileCount: number): number {
  if (value === undefined) {
    return 0;
  }

  if (!/^\d+$/u.test(value)) {
    throw new FilePathValidationError("Invalid shared file");
  }

  const index = Number(value);
  if (index >= fileCount) {
    throw new FilePathValidationError("Shared file not found", 404);
  }

  return index;
}
