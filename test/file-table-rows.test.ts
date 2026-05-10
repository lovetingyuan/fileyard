import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FileRow, FolderRow } from "../src/react-app/components/FileTableRows";

vi.mock("~icons/mdi/delete-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/dots-horizontal", () => ({ default: () => null }));
vi.mock("~icons/mdi/download", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder-sync", () => ({ default: () => null }));
vi.mock("~icons/mdi/information-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/share-variant-outline", () => ({ default: () => null }));
vi.mock("../src/react-app/constants/fileIcons", () => ({
  getFileIcon: () => ({ Icon: () => null, color: "" }),
}));

function hasDisabledButton(markup: string, ariaLabel: string): boolean {
  const escapedLabel = ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<button(?=[^>]*aria-label="${escapedLabel}")(?=[^>]*disabled)[^>]*>`,
  ).test(markup);
}

describe("file table rows", () => {
  it("renders folder names in bold", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderRow, {
        folder: {
          name: "Projects",
          path: "Projects",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
        isActionDisabled: false,
        isLoading: false,
        onNavigate: vi.fn(),
        onShowDetails: vi.fn(),
        onRequestDelete: vi.fn(),
      }),
    );

    expect(markup).toContain("Projects");
    expect(markup).toContain("font-bold");
  });

  it("keeps file row actions enabled unless that row is explicitly disabled", () => {
    const markup = renderToStaticMarkup(
      createElement(FileRow, {
        file: {
          name: "report.pdf",
          path: "docs/report.pdf",
          size: 1024,
          createdAt: "2026-04-19T00:00:00.000Z",
          uploadedAt: "2026-04-19T00:00:00.000Z",
          contentType: "application/pdf",
        },
        isActionDisabled: false,
        isLoading: false,
        onDownload: vi.fn(),
        onRequestDelete: vi.fn(),
        onPreview: vi.fn(),
        onShare: vi.fn(),
        onShowDetails: vi.fn(),
      }),
    );

    expect(hasDisabledButton(markup, "更多操作")).toBe(false);
  });

  it("disables and marks only the current row action menu as loading", () => {
    const markup = renderToStaticMarkup(
      createElement(FileRow, {
        file: {
          name: "report.pdf",
          path: "docs/report.pdf",
          size: 1024,
          createdAt: "2026-04-19T00:00:00.000Z",
          uploadedAt: "2026-04-19T00:00:00.000Z",
          contentType: "application/pdf",
        },
        isActionDisabled: true,
        isLoading: true,
        onDownload: vi.fn(),
        onRequestDelete: vi.fn(),
        onPreview: vi.fn(),
        onShare: vi.fn(),
        onShowDetails: vi.fn(),
      }),
    );

    expect(hasDisabledButton(markup, "更多操作")).toBe(true);
    expect(markup).toContain("loading");
  });
});
