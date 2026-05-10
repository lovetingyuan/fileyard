import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DeleteConfirmModal } from "../src/react-app/components/DeleteConfirmModal";

vi.mock("~icons/mdi/alert-circle-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/close", () => ({ default: () => null }));

describe("DeleteConfirmModal", () => {
  it("keeps the default folder delete copy when there are no active uploads", () => {
    const markup = renderToStaticMarkup(
      createElement(DeleteConfirmModal, {
        target: { type: "folder", name: "docs" },
        containedActiveUploadCount: 0,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
      }),
    );

    expect(markup).toContain("确认删除文件夹");
    expect(markup).toContain("确认删除");
    expect(markup).not.toContain("正在上传");
    expect(markup).not.toContain("取消上传并删除");
  });

  it("warns and changes confirm copy when deleting a folder with active uploads", () => {
    const markup = renderToStaticMarkup(
      createElement(DeleteConfirmModal, {
        target: { type: "folder", name: "docs" },
        containedActiveUploadCount: 2,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
      }),
    );

    expect(markup).toContain("该文件夹下有 2 个文件正在上传");
    expect(markup).toContain("确认后会先取消这些上传，再删除文件夹。");
    expect(markup).toContain("取消上传并删除");
  });
});
