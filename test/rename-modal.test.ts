import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RenameModal } from "../src/react-app/pages/dashboard/components/RenameModal";
import { getStoreMethods } from "../src/react-app/store";

vi.mock("~icons/mdi/close", () => ({ default: () => null }));
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../src/react-app/hooks/useFilesApi", () => ({
  useRenameFileMutation: () => ({ renameFile: vi.fn() }),
  useRenameFolderMutation: () => ({ renameFolder: vi.fn() }),
}));

vi.mock("../src/react-app/pages/dashboard/hooks/useDashboardFileView", () => ({
  useDashboardFileView: () => ({
    data: {
      folders: [{ name: "docs", path: "docs", createdAt: "2026-01-01T00:00:00.000Z" }],
      files: [
        {
          name: "report.txt",
          path: "report.txt",
          size: 10,
          createdAt: "2026-01-01T00:00:00.000Z",
          uploadedAt: "2026-01-01T00:00:00.000Z",
          contentType: "text/plain",
        },
      ],
    },
    refresh: vi.fn(),
  }),
}));

function resetStore() {
  const methods = getStoreMethods();
  methods.setPendingRenameTarget(null);
  methods.setRenamingPath(null);
  methods.setUploadQueue([]);
}

function renderRenameModal(): string {
  return renderToStaticMarkup(createElement(RenameModal));
}

function getSaveButtonTag(markup: string): string {
  return /<button(?=[^>]*>保存<\/button>)[^>]*>保存<\/button>/.exec(markup)?.[0] ?? "";
}

describe("RenameModal", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders the target copy and disables save when the name is unchanged", () => {
    getStoreMethods().setPendingRenameTarget({
      type: "file",
      path: "report.txt",
      name: "report.txt",
    });

    const markup = renderRenameModal();

    expect(markup).toContain("将 “report.txt” 文件重命名为");
    expect(markup).toContain("New file name must be different");
    expect(getSaveButtonTag(markup)).toContain("disabled");
  });

  it("warns and disables save when active uploads affect a folder rename", () => {
    const methods = getStoreMethods();
    methods.setPendingRenameTarget({
      type: "folder",
      path: "docs",
      name: "docs",
    });
    methods.setUploadQueue([
      {
        id: "upload-1",
        file: new File(["x"], "readme.md"),
        displayPath: "docs/readme.md",
        targetPath: "docs/readme.md",
        parentPath: "docs",
        name: "readme.md",
        size: 1,
        progress: 50,
        status: "uploading",
        errorMessage: null,
      },
    ]);

    const markup = renderRenameModal();

    expect(markup).toContain("将 “docs” 文件夹重命名为");
    expect(markup).toContain("该路径下有文件正在上传，请等待上传完成后再重命名。");
    expect(getSaveButtonTag(markup)).toContain("disabled");
  });
});
