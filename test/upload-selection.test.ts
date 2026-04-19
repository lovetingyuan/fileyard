import { describe, expect, it } from "vitest";
import {
  FILE_UPLOAD_BATCH_LIMIT_BYTES,
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
  it("creates queued upload items for multiple files in the current folder", () => {
    const items = createUploadQueueItems({
      files: [makeFile("a.txt", 10), makeFile("b.txt", 20)],
      currentPath: "docs",
      maxFileBytes: 100,
      maxBatchBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
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
      maxBatchBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
    });

    expect(items.map((item) => item.targetPath)).toEqual([
      "albums/Photos/cover.jpg",
      "albums/Photos/2026/raw.dng",
    ]);
    expect(items[1]?.parentPath).toBe("albums/Photos/2026");
  });

  it("marks every file oversized when the batch exceeds the total limit", () => {
    const items = createUploadQueueItems({
      files: [makeFile("a.bin", 70), makeFile("b.bin", 40)],
      currentPath: "",
      maxFileBytes: 100,
      maxBatchBytes: 100,
    });

    expect(items.map((item) => item.status)).toEqual(["oversized", "oversized"]);
    expect(items.every((item) => item.errorMessage?.includes("总大小"))).toBe(true);
  });

  it("marks only files over the single file limit when the batch fits", () => {
    const items = createUploadQueueItems({
      files: [makeFile("small.bin", 10), makeFile("large.bin", 101)],
      currentPath: "",
      maxFileBytes: 100,
      maxBatchBytes: 200,
    });

    expect(items.map((item) => item.status)).toEqual(["queued", "oversized"]);
    expect(items[1]?.errorMessage).toContain("单个文件");
  });

  it("marks duplicate target paths inside the same selection", () => {
    const items = createUploadQueueItems({
      files: [makeFile("same.txt", 10), makeFile("same.txt", 20)],
      currentPath: "",
      maxFileBytes: 100,
      maxBatchBytes: FILE_UPLOAD_BATCH_LIMIT_BYTES,
    });

    expect(items.map((item) => item.status)).toEqual(["duplicate", "duplicate"]);
    expect(items.every((item) => item.errorMessage?.includes("重复"))).toBe(true);
  });
});
