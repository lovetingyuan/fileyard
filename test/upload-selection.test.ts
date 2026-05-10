import { describe, expect, it } from "vitest";
import {
  EMPTY_FOLDER_UPLOAD_MESSAGE,
  FILE_UPLOAD_BATCH_LIMIT_BYTES,
  getUploadSelectionValidationMessage,
  createUploadQueueItems,
} from "../src/react-app/utils/uploadSelection";

function makeFile(name: string, size: number, relativePath = ""): File {
  const file = new File([new Uint8Array(size)], name);
  Object.defineProperty(file, "webkitRelativePath", {
    configurable: true,
    value: relativePath,
  });
  return file;
}

describe("upload selection", () => {
  it("rejects empty folder selections while leaving empty file selections silent", () => {
    expect(getUploadSelectionValidationMessage([], "folder")).toBe(EMPTY_FOLDER_UPLOAD_MESSAGE);
    expect(getUploadSelectionValidationMessage([], "file")).toBeNull();
  });

  it("rejects folder selections that contain more than one top-level folder", () => {
    const files = [
      makeFile("a.txt", 10, "Photos/a.txt"),
      makeFile("b.txt", 20, "Documents/b.txt"),
    ];

    expect(getUploadSelectionValidationMessage(files, "folder")).toBe("一次只能上传一个文件夹");
  });

  it("creates queued upload items for multiple files in the current folder", () => {
    const items = createUploadQueueItems({
      files: [makeFile("a.txt", 10), makeFile("b.txt", 20)],
      currentPath: "docs",
      maxFileBytes: 100,
      maxFilesPerUpload: 50,
      remainingBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
    });

    expect(items).toMatchObject([
      {
        displayPath: "docs/a.txt",
        targetPath: "docs/a.txt",
        parentPath: "docs",
        name: "a.txt",
        size: 10,
        progress: 0,
        status: "queued",
        errorMessage: null,
      },
      {
        displayPath: "docs/b.txt",
        targetPath: "docs/b.txt",
        parentPath: "docs",
        name: "b.txt",
        size: 20,
        progress: 0,
        status: "queued",
        errorMessage: null,
      },
    ]);
  });

  it("preserves the selected folder root in folder uploads", () => {
    const items = createUploadQueueItems({
      files: [
        makeFile("cover.jpg", 10, "Photos/cover.jpg"),
        makeFile("raw.dng", 20, "Photos/2026/raw.dng"),
      ],
      currentPath: "albums",
      maxFileBytes: 100,
      maxFilesPerUpload: 50,
      remainingBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
    });

    expect(items.map((item) => item.targetPath)).toEqual([
      "albums/Photos/cover.jpg",
      "albums/Photos/2026/raw.dng",
    ]);
    expect(items[1]?.parentPath).toBe("albums/Photos/2026");
  });

  it("marks every file oversized when the batch exceeds the remaining total storage limit", () => {
    const items = createUploadQueueItems({
      files: [makeFile("a.bin", 70), makeFile("b.bin", 40)],
      currentPath: "",
      maxFileBytes: 100,
      maxFilesPerUpload: 50,
      remainingBytes: 100,
    });

    expect(items.map((item) => item.status)).toEqual(["oversized", "oversized"]);
    expect(items.every((item) => item.errorMessage?.includes("剩余容量"))).toBe(true);
  });

  it("marks only files over the single file limit when the batch fits", () => {
    const items = createUploadQueueItems({
      files: [makeFile("small.bin", 10), makeFile("large.bin", 101)],
      currentPath: "",
      maxFileBytes: 100,
      maxFilesPerUpload: 50,
      remainingBytes: 200,
    });

    expect(items.map((item) => item.status)).toEqual(["queued", "oversized"]);
    expect(items[1]?.errorMessage).toContain("单个文件");
  });

  it("marks duplicate target paths inside the same selection", () => {
    const items = createUploadQueueItems({
      files: [makeFile("same.txt", 10), makeFile("same.txt", 20)],
      currentPath: "",
      maxFileBytes: 100,
      maxFilesPerUpload: 50,
      remainingBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
    });

    expect(items.map((item) => item.status)).toEqual(["duplicate", "duplicate"]);
    expect(items.every((item) => item.errorMessage?.includes("重复"))).toBe(true);
  });

  it("marks every file oversized when the selection exceeds the file count limit", () => {
    const items = createUploadQueueItems({
      files: [makeFile("a.txt", 10), makeFile("b.txt", 20), makeFile("c.txt", 30)],
      currentPath: "",
      maxFileBytes: 100,
      maxFilesPerUpload: 2,
      remainingBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
    });

    expect(items.map((item) => item.status)).toEqual(["oversized", "oversized", "oversized"]);
    expect(items.every((item) => item.errorMessage?.includes("文件数量"))).toBe(true);
  });
});
