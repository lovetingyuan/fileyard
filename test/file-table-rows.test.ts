import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileRow, FolderRow } from "../src/react-app/pages/dashboard/components/FileTableRows";

vi.mock("~icons/mdi/delete-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/dots-horizontal", () => ({ default: () => null }));
vi.mock("~icons/mdi/download", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder-sync", () => ({ default: () => null }));
vi.mock("~icons/mdi/information-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/pencil", () => ({ default: () => null }));
vi.mock("~icons/mdi/share-variant-outline", () => ({ default: () => null }));
vi.mock("../src/react-app/constants/fileIcons", () => ({
  getFileIcon: () => ({ Icon: () => null, color: "" }),
}));

const rowState = vi.hoisted(() => ({
  deletingFilePath: null as string | null,
  downloadingPath: null as string | null,
  renamingPath: null as string | null,
}));

vi.mock("../src/react-app/store", () => ({
  useAppStore: () => ({
    addNewFolderName: "",
    deletingFilePath: rowState.deletingFilePath,
    deletingFolderPath: rowState.deletingFilePath,
    downloadingPath: rowState.downloadingPath,
    renamingPath: rowState.renamingPath,
  }),
  getStoreMethods: () => ({
    setAddNewFolderName: vi.fn(),
    setIsCreatingNewFolder: vi.fn(),
  }),
}));

vi.mock("../src/react-app/pages/dashboard/hooks/useDashboardPath", () => ({
  useDashboardPath: () => ({
    currentPath: "",
    setPath: vi.fn(),
  }),
}));

function hasDisabledButton(markup: string, ariaLabel: string): boolean {
  const escapedLabel = ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<button(?=[^>]*aria-label="${escapedLabel}")(?=[^>]*disabled)[^>]*>`,
  ).test(markup);
}

describe("file table rows", () => {
  beforeEach(() => {
    rowState.deletingFilePath = null;
    rowState.downloadingPath = null;
    rowState.renamingPath = null;
  });

  it("renders folder names in bold", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderRow, {
        folder: {
          name: "Projects",
          path: "Projects",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
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
      }),
    );

    expect(hasDisabledButton(markup, "更多操作")).toBe(false);
  });

  it("renders rename actions for files and folders", () => {
    const folderMarkup = renderToStaticMarkup(
      createElement(FolderRow, {
        folder: {
          name: "Projects",
          path: "Projects",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
      }),
    );
    const fileMarkup = renderToStaticMarkup(
      createElement(FileRow, {
        file: {
          name: "report.pdf",
          path: "docs/report.pdf",
          size: 1024,
          createdAt: "2026-04-19T00:00:00.000Z",
          uploadedAt: "2026-04-19T00:00:00.000Z",
          contentType: "application/pdf",
        },
      }),
    );

    expect(folderMarkup).toContain("重命名");
    expect(fileMarkup).toContain("重命名");
  });

  it("disables and marks only the current row action menu as loading", () => {
    rowState.deletingFilePath = "docs/report.pdf";
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
      }),
    );

    expect(hasDisabledButton(markup, "更多操作")).toBe(true);
    expect(markup).toContain("loading");
  });

  it("disables row actions while any rename is running", () => {
    rowState.renamingPath = "other.txt";
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
      }),
    );

    expect(hasDisabledButton(markup, "更多操作")).toBe(true);
  });
});
