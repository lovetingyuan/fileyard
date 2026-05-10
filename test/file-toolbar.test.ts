import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FileToolbar } from "../src/react-app/components/FileToolbar";

vi.mock("~icons/mdi/file-upload", () => ({ default: () => null }));
vi.mock("~icons/mdi/file-plus", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder-plus", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder-upload", () => ({ default: () => null }));
vi.mock("~icons/mdi/home-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/magnify", () => ({ default: () => null }));
vi.mock("~icons/mdi/refresh", () => ({ default: () => null }));

function renderToolbar(isUploadDisabled = false): string {
  return renderToStaticMarkup(
    createElement(FileToolbar, {
      breadcrumbs: [],
      fileCount: 0,
      totalBytes: 0,
      isUploadDisabled,
      isCreateTextFileDisabled: false,
      isCreateFolderDisabled: false,
      isRefreshDisabled: false,
      isUploadingFile: false,
      isCreatingFolder: false,
      isRefreshing: false,
      isCreatingNewFolder: false,
      searchQuery: "",
      isSearchPending: false,
      onSetPath: vi.fn(),
      onUploadClick: vi.fn(),
      onUploadFolderClick: vi.fn(),
      onCreateFolder: vi.fn(),
      onCreateTextFile: vi.fn(),
      onRefresh: vi.fn(),
      onSearchChange: vi.fn(),
      onShowDirectoryStats: vi.fn(),
    }),
  );
}

function hasButton(markup: string, ariaLabel: string): boolean {
  return markup.includes(`aria-label="${ariaLabel}"`);
}

function hasDisabledButton(markup: string, ariaLabel: string): boolean {
  const escapedLabel = ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<button(?=[^>]*aria-label="${escapedLabel}")(?=[^>]*disabled)[^>]*>`,
  ).test(markup);
}

function getButtonClass(markup: string, ariaLabel: string): string {
  const escapedLabel = ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    new RegExp(`<button(?=[^>]*aria-label="${escapedLabel}")[^>]*class="([^"]+)"`).exec(
      markup,
    )?.[1] ?? ""
  );
}

describe("file toolbar", () => {
  it("renders separate upload file and upload folder buttons without an upload type dropdown", () => {
    const markup = renderToolbar();

    expect(hasButton(markup, "上传文件")).toBe(true);
    expect(hasButton(markup, "上传文件夹")).toBe(true);
    expect(hasButton(markup, "选择上传类型")).toBe(false);
  });

  it("disables both upload buttons when upload is disabled", () => {
    const markup = renderToolbar(true);

    expect(hasDisabledButton(markup, "上传文件")).toBe(true);
    expect(hasDisabledButton(markup, "上传文件夹")).toBe(true);
  });

  it("uses distinct but related green colors for the two upload buttons", () => {
    const markup = renderToolbar();

    const fileUploadClass = getButtonClass(markup, "上传文件");
    const folderUploadClass = getButtonClass(markup, "上传文件夹");

    expect(fileUploadClass).toContain("bg-emerald-500");
    expect(folderUploadClass).toContain("bg-green-500");
    expect(fileUploadClass).not.toBe(folderUploadClass);
  });
});
