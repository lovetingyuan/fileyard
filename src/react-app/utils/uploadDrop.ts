import type { UploadSelectionSource } from "./uploadSelection";

export type DroppedUploadFiles = {
  files: File[];
  source: UploadSelectionSource;
};

type EntryReadResult = {
  files: File[];
  hasDirectory: boolean;
};

function setRelativePath(file: File, relativePath: string): File {
  Object.defineProperty(file, "webkitRelativePath", {
    configurable: true,
    value: relativePath,
  });
  return file;
}

function readFileEntry(entry: FileSystemFileEntry, relativePath: string): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(
      (file) => {
        resolve(relativePath ? setRelativePath(file, relativePath) : file);
      },
      (error) => reject(error),
    );
  });
}

function readDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => {
    const entries: FileSystemEntry[] = [];

    function readNextBatch() {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
            return;
          }
          entries.push(...batch);
          readNextBatch();
        },
        (error) => reject(error),
      );
    }

    readNextBatch();
  });
}

async function readEntry(entry: FileSystemEntry, parentPath = ""): Promise<EntryReadResult> {
  const relativePath = parentPath ? `${parentPath}/${entry.name}` : entry.name;

  if (entry.isFile) {
    const file = await readFileEntry(entry as FileSystemFileEntry, relativePath);
    return {
      files: [file],
      hasDirectory: false,
    };
  }

  if (!entry.isDirectory) {
    return {
      files: [],
      hasDirectory: false,
    };
  }

  const childEntries = await readDirectoryEntries(
    (entry as FileSystemDirectoryEntry).createReader(),
  );
  const children = await Promise.all(childEntries.map((child) => readEntry(child, relativePath)));

  return {
    files: children.flatMap((child) => child.files),
    hasDirectory: true,
  };
}

function getDroppedEntries(dataTransfer: DataTransfer): FileSystemEntry[] {
  return Array.from(dataTransfer.items)
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
}

export async function getDroppedUploadFiles(
  dataTransfer: DataTransfer,
): Promise<DroppedUploadFiles> {
  const entries = getDroppedEntries(dataTransfer);

  if (entries.length === 0) {
    return {
      files: Array.from(dataTransfer.files),
      source: "file",
    };
  }

  const results = await Promise.all(entries.map((entry) => readEntry(entry)));
  const hasDirectory = results.some((result) => result.hasDirectory);

  return {
    files: results.flatMap((result) => result.files),
    source: hasDirectory ? "folder" : "file",
  };
}
