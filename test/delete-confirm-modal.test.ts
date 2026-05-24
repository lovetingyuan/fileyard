import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteConfirmModal } from "../src/react-app/pages/dashboard/components/DeleteConfirmModal";
import { getStoreMethods } from "../src/react-app/store";

vi.mock("~icons/mdi/alert-circle-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/close", () => ({ default: () => null }));
vi.mock("../src/react-app/hooks/useFilesApi", () => ({
  useDeleteFileMutation: () => ({ deleteFile: vi.fn() }),
  useDeleteFolderMutation: () => ({ deleteFolder: vi.fn() }),
}));

vi.mock("../src/react-app/pages/dashboard/hooks/useDashboardFileView", () => ({
  useDashboardFileView: () => ({
    refresh: vi.fn(),
  }),
}));

function uploadItem(id: string) {
  return {
    id,
    file: new File(["x"], `${id}.txt`),
    displayPath: `docs/${id}.txt`,
    targetPath: `docs/${id}.txt`,
    parentPath: "docs",
    name: `${id}.txt`,
    size: 1,
    progress: 1,
    status: "uploading" as const,
    errorMessage: null,
  };
}

describe("DeleteConfirmModal", () => {
  beforeEach(() => {
    const methods = getStoreMethods();
    methods.setPendingDeleteTarget(null);
    methods.setUploadQueue([]);
    methods.setDeletingFilePath(null);
    methods.setDeletingFolderPath(null);
  });

  it("keeps the default folder delete copy when there are no active uploads", () => {
    getStoreMethods().setPendingDeleteTarget({ type: "folder", path: "docs", name: "docs" });
    const markup = renderToStaticMarkup(createElement(DeleteConfirmModal));

    expect(markup).toContain("确认删除文件夹");
    expect(markup).toContain("确认删除");
    expect(markup).not.toContain("正在上传");
    expect(markup).not.toContain("取消上传并删除");
  });

  it("warns and changes confirm copy when deleting a folder with active uploads", () => {
    getStoreMethods().setPendingDeleteTarget({ type: "folder", path: "docs", name: "docs" });
    getStoreMethods().setUploadQueue([uploadItem("a"), uploadItem("b")]);
    const markup = renderToStaticMarkup(createElement(DeleteConfirmModal));

    expect(markup).toContain("该文件夹下有 2 个文件正在上传");
    expect(markup).toContain("确认后会先取消这些上传，再删除文件夹。");
    expect(markup).toContain("取消上传并删除");
  });
});
