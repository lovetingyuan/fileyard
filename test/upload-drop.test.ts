import { describe, expect, it } from "vitest";
import { getDroppedUploadFiles } from "../src/react-app/utils/uploadDrop";

type MockEntry = FileSystemEntry & {
  _children?: MockEntry[][];
  _file?: File;
};

function makeFile(name: string, content = "x"): File {
  return new File([content], name);
}

function fileEntry(name: string, file = makeFile(name)): MockEntry {
  return {
    filesystem: {} as FileSystem,
    fullPath: `/${name}`,
    getParent: () => undefined,
    isDirectory: false,
    isFile: true,
    name,
    file(successCallback: FileCallback) {
      successCallback(file);
    },
  } as MockEntry & FileSystemFileEntry;
}

function directoryEntry(name: string, childrenBatches: MockEntry[][]): MockEntry {
  return {
    filesystem: {} as FileSystem,
    fullPath: `/${name}`,
    getParent: () => undefined,
    isDirectory: true,
    isFile: false,
    name,
    createReader() {
      let index = 0;
      return {
        readEntries(successCallback: FileSystemEntriesCallback) {
          successCallback(childrenBatches[index++] ?? []);
        },
      } as FileSystemDirectoryReader;
    },
  } as MockEntry & FileSystemDirectoryEntry;
}

function itemWithEntry(entry: MockEntry): DataTransferItem {
  return {
    getAsFile: () => (entry.isFile ? (entry as MockEntry)._file ?? null : null),
    getAsString: () => undefined,
    kind: "file",
    type: "",
    webkitGetAsEntry: () => entry,
  } as DataTransferItem;
}

function dataTransferWithItems(items: DataTransferItem[], files: File[] = []): DataTransfer {
  return {
    files,
    items,
  } as unknown as DataTransfer;
}

function getRelativePaths(files: File[]): string[] {
  return files.map((file) => file.webkitRelativePath);
}

describe("upload drop", () => {
  it("falls back to dropped files when entry APIs are unavailable", async () => {
    const files = [makeFile("a.txt"), makeFile("b.txt")];
    const result = await getDroppedUploadFiles({
      files,
      items: [],
    } as unknown as DataTransfer);

    expect(result.source).toBe("file");
    expect(result.files).toEqual(files);
  });

  it("recursively expands a dropped folder and preserves relative paths", async () => {
    const folder = directoryEntry("Photos", [
      [
        fileEntry("cover.jpg", makeFile("cover.jpg")),
        directoryEntry("Raw", [[fileEntry("image.dng", makeFile("image.dng"))], []]),
      ],
      [],
    ]);

    const result = await getDroppedUploadFiles(dataTransferWithItems([itemWithEntry(folder)]));

    expect(result.source).toBe("folder");
    expect(result.files.map((file) => file.name)).toEqual(["cover.jpg", "image.dng"]);
    expect(getRelativePaths(result.files)).toEqual(["Photos/cover.jpg", "Photos/Raw/image.dng"]);
  });

  it("keeps reading directory entries until the browser returns an empty batch", async () => {
    const folder = directoryEntry("Docs", [
      [fileEntry("a.txt", makeFile("a.txt"))],
      [fileEntry("b.txt", makeFile("b.txt"))],
      [],
    ]);

    const result = await getDroppedUploadFiles(dataTransferWithItems([itemWithEntry(folder)]));

    expect(result.source).toBe("folder");
    expect(result.files.map((file) => file.name)).toEqual(["a.txt", "b.txt"]);
    expect(getRelativePaths(result.files)).toEqual(["Docs/a.txt", "Docs/b.txt"]);
  });

  it("returns an empty folder upload selection for empty dropped folders", async () => {
    const result = await getDroppedUploadFiles(
      dataTransferWithItems([itemWithEntry(directoryEntry("Empty", [[]]))]),
    );

    expect(result).toEqual({
      source: "folder",
      files: [],
    });
  });
});
