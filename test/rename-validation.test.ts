import { describe, expect, it } from "vitest";
import type { FolderEntry, FileEntry, UploadQueueItem } from "../src/types";
import {
  getRenameValidationMessage,
  getRenamedPath,
  isUploadBlockingRename,
} from "../src/react-app/utils/renameValidation";

const files: FileEntry[] = [
  {
    name: "report.txt",
    path: "report.txt",
    size: 10,
    createdAt: "2026-01-01T00:00:00.000Z",
    uploadedAt: "2026-01-01T00:00:00.000Z",
    contentType: "text/plain",
  },
];

const folders: FolderEntry[] = [
  {
    name: "docs",
    path: "docs",
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];

function uploadItem(targetPath: string, status: UploadQueueItem["status"] = "uploading") {
  return {
    id: targetPath,
    file: new File(["x"], targetPath.split("/").pop() ?? "upload.txt"),
    displayPath: targetPath,
    targetPath,
    parentPath: targetPath.includes("/") ? targetPath.slice(0, targetPath.lastIndexOf("/")) : "",
    name: targetPath.split("/").pop() ?? targetPath,
    size: 1,
    progress: 50,
    status,
    errorMessage: null,
  } satisfies UploadQueueItem;
}

describe("rename validation", () => {
  it("builds renamed paths in the original parent folder", () => {
    expect(getRenamedPath("report.txt", "summary.txt")).toBe("summary.txt");
    expect(getRenamedPath("docs/report.txt", "summary.txt")).toBe("docs/summary.txt");
  });

  it("rejects empty, unchanged, invalid, reserved, and colliding names", () => {
    expect(
      getRenameValidationMessage({
        currentName: "report.txt",
        files,
        folders,
        name: "",
        type: "file",
      }),
    ).toBe("File name cannot be empty");
    expect(
      getRenameValidationMessage({
        currentName: "report.txt",
        files,
        folders,
        name: "report.txt",
        type: "file",
      }),
    ).toBe("New file name must be different");
    expect(
      getRenameValidationMessage({
        currentName: "report.txt",
        files,
        folders,
        name: "bad/name",
        type: "file",
      }),
    ).toBe('File name cannot contain "/"');
    expect(
      getRenameValidationMessage({
        currentName: "report.txt",
        files,
        folders,
        name: ".user",
        type: "file",
      }),
    ).toBe("This is a reserved name");
    expect(
      getRenameValidationMessage({
        currentName: "report.txt",
        files,
        folders,
        name: "docs",
        type: "file",
      }),
    ).toBe("A folder with this name already exists");
    expect(
      getRenameValidationMessage({
        currentName: "docs",
        files,
        folders,
        name: "report.txt",
        type: "folder",
      }),
    ).toBe("A file with this name already exists");
  });

  it("blocks active uploads in old or new rename targets", () => {
    expect(
      isUploadBlockingRename({
        newPath: "docs/renamed.txt",
        oldPath: "docs/report.txt",
        targetType: "file",
        uploadQueue: [uploadItem("docs/report.txt")],
      }),
    ).toBe(true);
    expect(
      isUploadBlockingRename({
        newPath: "docs/renamed.txt",
        oldPath: "docs/report.txt",
        targetType: "file",
        uploadQueue: [uploadItem("docs/renamed.txt")],
      }),
    ).toBe(true);
    expect(
      isUploadBlockingRename({
        newPath: "archive",
        oldPath: "docs",
        targetType: "folder",
        uploadQueue: [uploadItem("docs/nested/readme.md")],
      }),
    ).toBe(true);
    expect(
      isUploadBlockingRename({
        newPath: "archive",
        oldPath: "docs",
        targetType: "folder",
        uploadQueue: [uploadItem("archive/readme.md")],
      }),
    ).toBe(true);
    expect(
      isUploadBlockingRename({
        newPath: "archive",
        oldPath: "docs",
        targetType: "folder",
        uploadQueue: [uploadItem("docs/readme.md", "success")],
      }),
    ).toBe(false);
  });
});
