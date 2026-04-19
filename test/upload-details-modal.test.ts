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

  it("shows completed text on the summary action when uploads are finished", () => {
    const markup = renderToStaticMarkup(
      createElement(UploadDetailsModal, {
        isOpen: true,
        items: [item("first", "success"), item("second", "success")],
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onCancelRemaining: vi.fn(),
      }),
    );

    expect(markup).toContain("共 2 个文件");
    expect(markup).toContain("剩余 0");
    expect(markup).toContain('class="btn btn-outline btn-success btn-sm"');
    expect(markup).toContain(">已完成</button>");
    expect(markup).not.toContain("取消全部剩余上传");
  });

  it("hides successful uploads from the upload list while keeping them in summary stats", () => {
    const markup = renderToStaticMarkup(
      createElement(UploadDetailsModal, {
        isOpen: true,
        items: [item("done", "success"), item("uploading", "uploading"), item("failed", "failed")],
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onCancelRemaining: vi.fn(),
      }),
    );

    expect(markup).toContain("共 3 个文件");
    expect(markup).toContain("剩余 1");
    expect(markup).toContain("失败 1");
    expect(markup).not.toContain("Folder/done.txt");
    expect(markup).toContain("Folder/uploading.txt");
    expect(markup).toContain("Folder/failed.txt");
  });

  it("renders upload rows as single divided lines with wrapping text metadata", () => {
    const markup = renderToStaticMarkup(
      createElement(UploadDetailsModal, {
        isOpen: true,
        items: [item("uploading", "uploading")],
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onCancelRemaining: vi.fn(),
      }),
    );

    expect(markup).toContain('class="divide-y divide-base-300"');
    expect(markup).toContain('class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2"');
    expect(markup).toContain('class="shrink-0 text-xs font-medium tabular-nums"');
    expect(markup).not.toContain("<progress");
    expect(markup).not.toContain("progress progress-primary");
    expect(markup).not.toContain("rounded-box border border-base-300 bg-base-100 p-3");
  });

  it("keeps summary actions fixed above a styled scrollable upload list", () => {
    const hiddenFirefoxScrollbarClass = "[scrollbar-" + "width:none]";
    const hiddenWebkitScrollbarClass = "[&" + "::-webkit-" + "scrollbar]" + ":hidden";

    const markup = renderToStaticMarkup(
      createElement(UploadDetailsModal, {
        isOpen: true,
        items: [item("uploading", "uploading"), item("failed", "failed", "Network error")],
        onClose: vi.fn(),
        onCancel: vi.fn(),
        onRetry: vi.fn(),
        onCancelRemaining: vi.fn(),
      }),
    );

    expect(markup).toContain('class="max-h-[70vh] overflow-hidden"');
    expect(markup).toContain('class="flex flex-col gap-4"');
    expect(markup).toContain('class="relative min-h-0 max-h-[calc(70vh-7rem)]"');
    expect(markup).toContain("max-h-[calc(70vh-7rem)] overflow-y-auto");
    expect(markup).toContain("[scrollbar-gutter:stable]");
    expect(markup).not.toContain(hiddenFirefoxScrollbarClass);
    expect(markup).not.toContain(hiddenWebkitScrollbarClass);
    expect(markup).not.toContain('type="range"');
    expect(markup).not.toContain('aria-label="上传列表滚动条"');
  });
});
