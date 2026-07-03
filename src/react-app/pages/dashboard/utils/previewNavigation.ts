import type { FileEntry } from "../../../../types";

export type PreviewNavigationDirection = "previous" | "next";

export function getAdjacentPreviewFile(
  files: readonly FileEntry[],
  currentFile: FileEntry | null,
  direction: PreviewNavigationDirection,
): FileEntry | null {
  if (!currentFile || files.length === 0) {
    return null;
  }

  const currentIndex = files.findIndex((file) => file.path === currentFile.path);
  if (currentIndex === -1) {
    return null;
  }

  const nextIndex = direction === "previous" ? currentIndex - 1 : currentIndex + 1;
  return files[nextIndex] ?? null;
}
