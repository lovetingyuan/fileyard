import type { BatchOperationRequestTarget } from "../../types";
import { getBaseName, getFileKey, getFolderPrefix, isFolderMarkerName } from "../utils/fileManager";

export type ArchiveFileEntry = {
  kind: "file";
  key: string;
  lastModified: Date;
  name: string;
  size: number;
};

export type ArchiveFolderEntry = {
  kind: "folder";
  lastModified: Date;
  name: string;
};

export type ArchiveEntry = ArchiveFileEntry | ArchiveFolderEntry;

function getTargetKey(target: BatchOperationRequestTarget): string {
  return `${target.type}:${target.path}`;
}

export function dedupeArchiveTargets(
  targets: BatchOperationRequestTarget[],
): BatchOperationRequestTarget[] {
  const seenKeys = new Set<string>();
  const dedupedTargets: BatchOperationRequestTarget[] = [];

  for (const target of targets) {
    const key = getTargetKey(target);
    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    dedupedTargets.push(target);
  }

  return dedupedTargets;
}

function getMarkerFolderPath(relativePath: string): string | null {
  const segments = relativePath.split("/");
  const markerName = segments.at(-1);
  if (!markerName || !isFolderMarkerName(markerName)) {
    return null;
  }

  return segments.slice(0, -1).join("/");
}

function createFolderEntryName(folderName: string, relativePath: string): string {
  return `${folderName}/${relativePath}`.replace(/\/?$/u, "/");
}

function hasFileDescendant(relativePaths: string[], folderPath: string): boolean {
  const prefix = folderPath ? `${folderPath}/` : "";
  return relativePaths.some(
    (relativePath) => relativePath.startsWith(prefix) && getMarkerFolderPath(relativePath) === null,
  );
}

function createFileEntry(object: R2Object, name: string): ArchiveFileEntry {
  return {
    kind: "file",
    key: object.key,
    lastModified: object.uploaded,
    name,
    size: object.size,
  };
}

function createFolderEntry(object: R2Object, name: string): ArchiveFolderEntry {
  return {
    kind: "folder",
    lastModified: object.uploaded,
    name,
  };
}

export function createArchiveEntries(
  rootDirId: string,
  targets: BatchOperationRequestTarget[],
  objects: R2Object[],
): ArchiveEntry[] {
  const entries: ArchiveEntry[] = [];
  const objectsByKey = new Map<string, R2Object>();
  for (const object of objects) {
    objectsByKey.set(object.key, object);
  }

  for (const target of dedupeArchiveTargets(targets)) {
    if (target.type === "file") {
      const object = objectsByKey.get(getFileKey(rootDirId, target.path));
      if (object) {
        entries.push(createFileEntry(object, getBaseName(target.path)));
      }
      continue;
    }

    const prefix = getFolderPrefix(rootDirId, target.path);
    const folderName = getBaseName(target.path);
    const targetObjects = objects.filter((object) => object.key.startsWith(prefix));
    const relativePaths = targetObjects.map((object) => object.key.slice(prefix.length));

    for (const object of targetObjects) {
      const relativePath = object.key.slice(prefix.length);
      const markerFolderPath = getMarkerFolderPath(relativePath);
      if (markerFolderPath !== null) {
        if (hasFileDescendant(relativePaths, markerFolderPath)) {
          continue;
        }

        entries.push(
          createFolderEntry(
            object,
            markerFolderPath
              ? createFolderEntryName(folderName, markerFolderPath)
              : `${folderName}/`,
          ),
        );
        continue;
      }

      entries.push(createFileEntry(object, `${folderName}/${relativePath}`));
    }
  }

  return entries;
}
