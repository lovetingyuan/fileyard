import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { UploadQueueItem } from "../src/types";
import { UploadProgressPanel } from "../src/react-app/components/UploadProgressPanel";
import type { UploadQueuePanelState } from "../src/react-app/hooks/useUploadQueue";

vi.mock("~icons/mdi/close-circle-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/close", () => ({ default: () => "close-icon" }));
vi.mock("~icons/mdi/chevron-down", () => ({ default: () => "chevron-down-icon" }));
vi.mock("~icons/mdi/chevron-up", () => ({ default: () => "chevron-up-icon" }));
vi.mock("~icons/mdi/refresh", () => ({ default: () => null }));
vi.mock("~icons/mdi/window-minimize", () => ({ default: () => "window-minimize-icon" }));

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

function panelState(total: number): UploadQueuePanelState {
  return {
    total,
    remaining: total,
    failed: 0,
    active: total,
    hasVisibleStatus: true,
    canceled: 0,
    completed: 0,
    totalProgress: 25,
    canCancelAll: true,
    hasTerminalIssues: false,
    isComplete: false,
    shouldShowPanel: true,
  };
}

function renderPanel(overrides: Partial<Parameters<typeof UploadProgressPanel>[0]> = {}): string {
  const items = Array.from({ length: 5 }, (_, index) => item(`file-${index + 1}`));

  return renderToStaticMarkup(
    createElement(UploadProgressPanel, {
      items,
      panelState: panelState(items.length),
      isMinimized: false,
      onMinimize: vi.fn(),
      onRestore: vi.fn(),
      onCancel: vi.fn(),
      onRetry: vi.fn(),
      onCancelAll: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }),
  );
}

function terminalPanelState(overrides: Partial<UploadQueuePanelState>): UploadQueuePanelState {
  return {
    ...panelState(overrides.total ?? 1),
    remaining: 0,
    active: 0,
    canCancelAll: false,
    isComplete: true,
    totalProgress: 100,
    ...overrides,
  };
}

describe("UploadProgressPanel", () => {
  it("keeps the expanded upload list visible and exposes collapse without close controls", () => {
    const markup = renderPanel();

    expect(markup).toContain('aria-label="折叠上传进度面板"');
    expect(markup).toContain("chevron-down-icon");
    expect(markup).not.toContain("window-minimize-icon");
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

  it("lays out the expanded header as title/actions above summary/progress rows", () => {
    const markup = renderPanel();

    expect(markup).toContain('class="space-y-1"');
    expect(markup).toContain('class="flex items-start justify-between gap-3"');
    expect(markup).toContain('class="min-w-0 flex-1 truncate text-sm font-semibold"');
    expect(markup).toContain('class="flex items-center justify-between gap-3 mx-2 mt-2"');
    expect(markup).toContain('class="min-w-0 truncate text-xs text-base-content/60"');
    expect(markup).toContain('class="shrink-0 text-sm font-semibold tabular-nums"');
    expect(markup).toContain("上传文件");
    expect(markup).toContain("全部取消");
    expect(markup).toContain("0/5 已完成 · 5 个进行中");
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
      item("success", "success"),
      item("failed", "failed"),
      item("canceled", "canceled"),
      item("oversized", "oversized"),
      item("duplicate", "duplicate"),
    ];
    const markup = renderPanel({ items, panelState: panelState(items.length) });

    expect(markup).toContain("bg-slate-100");
    expect(markup).toContain("bg-sky-100");
    expect(markup).toContain("bg-cyan-100");
    expect(markup).toContain("bg-rose-100");
    expect(markup).toContain("bg-amber-100");
    expect(markup).toContain("bg-violet-100");
    expect(markup).not.toContain("bg-emerald-100");
    expect(markup).not.toContain("bg-zinc-200");
  });

  it("hides completed and canceled uploads from the visible list", () => {
    const items: UploadQueueItem[] = [
      item("active", "uploading"),
      item("done", "success"),
      item("stopped", "canceled"),
      item("failed", "failed"),
    ];
    const markup = renderPanel({ items, panelState: panelState(items.length) });

    expect(markup).toContain("active.txt");
    expect(markup).toContain("failed.txt");
    expect(markup).not.toContain("done.txt");
    expect(markup).not.toContain("stopped.txt");
  });

  it("does not expose a close control while minimized", () => {
    const markup = renderPanel({ isMinimized: true });

    expect(markup).toContain("w-[min(16rem,calc(100vw-2rem))]");
    expect(markup).not.toContain("w-[min(20rem,calc(100vw-2rem))]");
    expect(markup).toContain('aria-label="展开上传进度面板"');
    expect(markup).toContain("chevron-up-icon");
    expect(markup).not.toContain("关闭上传进度面板");
  });

  it("lays out minimized title and actions above upload summary and progress", () => {
    const markup = renderPanel({
      isMinimized: true,
      items: [item("done", "success")],
      panelState: terminalPanelState({
        total: 1,
        completed: 1,
        hasTerminalIssues: false,
        shouldShowPanel: true,
      }),
    });

    expect(markup).toContain('class="space-y-1"');
    expect(markup).toContain('class="flex items-start justify-between gap-2"');
    expect(markup).toContain('class="min-w-0 flex-1 truncate text-sm font-semibold"');
    expect(markup).toContain('class="flex shrink-0 items-center gap-1"');
    expect(markup).toContain('aria-label="展开上传进度面板"');
    expect(markup).toContain('aria-label="关闭上传进度面板"');
    expect(markup).toContain('class="flex items-center justify-between gap-3"');
    expect(markup).toContain('class="min-w-0 truncate text-xs text-success"');
    expect(markup).toContain('class="shrink-0 text-sm font-semibold tabular-nums"');
  });

  it("shows a close button and error-colored summary after uploads end with issues", () => {
    const markup = renderPanel({
      isMinimized: true,
      items: [item("failed", "failed")],
      panelState: terminalPanelState({
        total: 1,
        failed: 1,
        hasTerminalIssues: true,
        shouldShowPanel: true,
      }),
    });

    expect(markup).toContain('aria-label="关闭上传进度面板"');
    expect(markup).toContain("close-icon");
    expect(markup).toContain('class="min-w-0 truncate text-xs text-error"');
  });

  it("uses success-colored summary text for a completed successful panel", () => {
    const markup = renderPanel({
      isMinimized: true,
      items: [item("done", "success")],
      panelState: terminalPanelState({
        total: 1,
        completed: 1,
        hasTerminalIssues: false,
        shouldShowPanel: true,
      }),
    });

    expect(markup).toContain('class="min-w-0 truncate text-xs text-success"');
  });

  it("keeps minimized percentage text without rendering a progress bar", () => {
    const markup = renderPanel({ isMinimized: true });

    expect(markup).toContain("25%");
    expect(markup).not.toContain("<progress");
    expect(markup).not.toContain('role="progressbar"');
  });
});
