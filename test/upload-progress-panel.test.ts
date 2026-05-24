import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UploadQueueItem } from "../src/types";
import { UploadProgressPanel } from "../src/react-app/pages/dashboard/components/UploadProgressPanel";
import { getStoreMethods } from "../src/react-app/store";

vi.mock("~icons/mdi/close-circle-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/close", () => ({ default: () => "close-icon" }));
vi.mock("~icons/mdi/chevron-down", () => ({ default: () => "chevron-down-icon" }));
vi.mock("~icons/mdi/chevron-up", () => ({ default: () => "chevron-up-icon" }));
vi.mock("~icons/mdi/refresh", () => ({ default: () => null }));

function item(id: string, status: UploadQueueItem["status"] = "uploading"): UploadQueueItem {
  return {
    id,
    file: new File(["x"], `${id}.txt`),
    displayPath: `${id}.txt`,
    targetPath: `${id}.txt`,
    parentPath: "",
    name: `${id}.txt`,
    size: 1,
    progress: 25,
    status,
    errorMessage: null,
  };
}

function renderPanel({
  isMinimized = false,
  items = Array.from({ length: 5 }, (_, index) => item(`file-${index + 1}`)),
}: {
  isMinimized?: boolean;
  items?: UploadQueueItem[];
} = {}): string {
  const methods = getStoreMethods();
  methods.setUploadQueue(items);
  methods.setIsUploadPanelMinimized(isMinimized);
  return renderToStaticMarkup(createElement(UploadProgressPanel));
}

describe("UploadProgressPanel", () => {
  beforeEach(() => {
    getStoreMethods().setUploadQueue([]);
    getStoreMethods().setIsUploadPanelMinimized(false);
  });

  it("keeps the expanded upload list visible and exposes collapse without close controls", () => {
    const markup = renderPanel();

    expect(markup).toContain('aria-label="折叠上传进度面板"');
    expect(markup).toContain("chevron-down-icon");
    expect(markup).not.toContain("展开上传进度面板");
    expect(markup).not.toContain("关闭上传进度面板");
    expect(markup).toContain("file-5.txt");
  });

  it("keeps percentage text without rendering progress bars", () => {
    const markup = renderPanel();

    expect(markup).toContain("25%");
    expect(markup).not.toContain("<progress");
    expect(markup).not.toContain('role="progressbar"');
  });

  it("renders file name, size, status, percentage, and actions in one truncating row", () => {
    const markup = renderPanel();

    expect(markup).toContain('class="flex min-w-0 items-center gap-2"');
    expect(markup).toContain('class="min-w-0 flex-1 truncate text-sm font-medium"');
    expect(markup).toContain('class="shrink-0 text-xs text-base-content/60"');
    expect(markup).toContain('class="badge badge-xs shrink-0 border-cyan-200 bg-cyan-100 text-cyan-800"');
    expect(markup).toContain('class="shrink-0 text-xs font-medium tabular-nums"');
    expect(markup).toContain('aria-label="取消上传 file-1.txt"');
    expect(markup).not.toContain("flex-wrap");
  });

  it("uses distinct status badge background colors for each visible upload state", () => {
    const items: UploadQueueItem[] = [
      item("queued", "queued"),
      item("preparing", "preparing"),
      item("uploading", "uploading"),
      item("failed", "failed"),
      item("oversized", "oversized"),
      item("duplicate", "duplicate"),
    ];
    const markup = renderPanel({ items });

    expect(markup).toContain("bg-slate-100");
    expect(markup).toContain("bg-sky-100");
    expect(markup).toContain("bg-cyan-100");
    expect(markup).toContain("bg-rose-100");
    expect(markup).toContain("bg-amber-100");
    expect(markup).toContain("bg-violet-100");
  });

  it("hides completed and canceled uploads from the visible list", () => {
    const items: UploadQueueItem[] = [
      item("active", "uploading"),
      item("done", "success"),
      item("stopped", "canceled"),
      item("failed", "failed"),
    ];
    const markup = renderPanel({ items });

    expect(markup).toContain("active.txt");
    expect(markup).toContain("failed.txt");
    expect(markup).not.toContain("done.txt");
    expect(markup).not.toContain("stopped.txt");
  });

  it("does not expose a close control while minimized with active uploads", () => {
    const markup = renderPanel({ isMinimized: true });

    expect(markup).toContain("w-[min(16rem,calc(100vw-2rem))]");
    expect(markup).toContain('aria-label="展开上传进度面板"');
    expect(markup).toContain("chevron-up-icon");
    expect(markup).not.toContain("关闭上传进度面板");
  });

  it("shows a close button and error-colored summary after uploads end with issues", () => {
    const markup = renderPanel({ isMinimized: true, items: [item("failed", "failed")] });

    expect(markup).toContain('aria-label="关闭上传进度面板"');
    expect(markup).toContain("close-icon");
    expect(markup).toContain('class="min-w-0 truncate text-xs text-error"');
  });
});
