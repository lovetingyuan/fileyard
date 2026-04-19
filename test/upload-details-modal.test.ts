import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { UploadQueueItem } from "../src/types";
import { UploadDetailsModal } from "../src/react-app/components/UploadDetailsModal";

vi.mock("~icons/mdi/close-circle-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/close", () => ({ default: () => null }));
vi.mock("~icons/mdi/refresh", () => ({ default: () => null }));

function item(id: string, status: UploadQueueItem["status"], errorMessage: string | null = null) {
  return {
    id,
    file: new File(["x"], `${id}.txt`),
    displayPath: `Folder/${id}.txt`,
    targetPath: `Folder/${id}.txt`,
    parentPath: "Folder",
    name: `${id}.txt`,
    size: 1,
    progress: status === "success" ? 100 : 25,
    status,
    errorMessage,
  } satisfies UploadQueueItem;
}

describe("UploadDetailsModal", () => {
  it("renders summary stats, paths, progress, and state-specific actions", () => {
    const markup = renderToStaticMarkup(
      createElement(UploadDetailsModal, {
        isOpen: true,
        items: [
          item("uploading", "uploading"),
          item("failed", "failed", "Network error"),
          item("large", "oversized", "单个文件大小超过限制"),
          item("same", "duplicate", "名称重复"),
        ],
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onCancelRemaining: vi.fn(),
      }),
    );

    expect(markup).toContain("共 4 个文件");
    expect(markup).toContain("剩余 1");
    expect(markup).toContain("失败 3");
    expect(markup).toContain("取消全部剩余上传");
    expect(markup).toContain("Folder/uploading.txt");
    expect(markup).toContain("25%");
    expect(markup).toContain("Network error");
    expect(markup).toContain("重试");
    expect(markup).toContain("单个文件大小超过限制");
    expect(markup).toContain("名称重复");
    expect(markup).toContain("取消");
  });
});
