import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileToolbar } from "../src/react-app/pages/dashboard/components/FileToolbar";

vi.mock("~icons/mdi/arrow-down", () => ({ default: () => null }));
vi.mock("~icons/mdi/arrow-up", () => ({ default: () => null }));
vi.mock("~icons/mdi/file-upload", () => ({ default: () => null }));
vi.mock("~icons/mdi/file-plus", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder-plus", () => ({ default: () => null }));
vi.mock("~icons/mdi/folder-upload", () => ({ default: () => null }));
vi.mock("~icons/mdi/home-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/magnify", () => ({ default: () => null }));
vi.mock("~icons/mdi/refresh", () => ({ default: () => null }));
vi.mock("~icons/mdi/swap-vertical", () => ({ default: () => null }));

let uploadQueueActive = false;
let renamingActive = false;

vi.mock("../src/react-app/store", () => ({
  useAppStore: () => ({
    creatingFolder: false,
    dashboardSortKey: "uploadedAt",
    dashboardSortOrder: "desc",
    isCreatingNewFolder: false,
    renamingPath: renamingActive ? "docs/report.txt" : null,
    savingTextFile: false,
    uploadQueue: uploadQueueActive
      ? [
          {
            id: "upload-1",
            file: new File(["x"], "upload.txt"),
            displayPath: "upload.txt",
            targetPath: "upload.txt",
            parentPath: "",
            name: "upload.txt",
            size: 1,
            progress: 50,
            status: "uploading",
            errorMessage: null,
          },
        ]
      : [],
  }),
}));

vi.mock("../src/react-app/pages/dashboard/hooks/useDashboardPath", () => ({
  useDashboardPath: () => ({
    breadcrumbs: [],
    currentPath: "",
    setPath: vi.fn(),
  }),
}));

vi.mock("../src/react-app/pages/dashboard/hooks/useDashboardFileView", () => ({
  useDashboardFileView: () => ({
    filteredFiles: [],
    getUniqueFolderName: () => "新建文件夹",
    isRefreshing: false,
    isSearchPending: false,
    refresh: vi.fn(),
    searchInputValue: "",
    totalBytes: 0,
  }),
}));

function renderToolbar(): string {
  return renderToStaticMarkup(createElement(FileToolbar));
}

function hasButton(markup: string, ariaLabel: string): boolean {
  return markup.includes(`aria-label="${ariaLabel}"`);
}

function getButtonTag(markup: string, ariaLabel: string): string {
  const escapedLabel = ariaLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`<button(?=[^>]*aria-label="${escapedLabel}")[^>]*>`).exec(markup)?.[0] ?? "";
}

function hasDisabledButton(markup: string, ariaLabel: string): boolean {
  return /\sdisabled(?:=""|="disabled")?(?=[\s>])/.test(getButtonTag(markup, ariaLabel));
}

function getButtonClass(markup: string, ariaLabel: string): string {
  return /class="([^"]+)"/.exec(getButtonTag(markup, ariaLabel))?.[1] ?? "";
}

describe("file toolbar", () => {
  beforeEach(() => {
    uploadQueueActive = false;
    renamingActive = false;
  });

  it("renders separate upload file and upload folder buttons without an upload type dropdown", () => {
    const markup = renderToolbar();

    expect(hasButton(markup, "上传文件")).toBe(true);
    expect(hasButton(markup, "上传文件夹")).toBe(true);
    expect(hasButton(markup, "选择上传类型")).toBe(false);
  });

  it("keeps both upload buttons enabled from internal dashboard state", () => {
    const markup = renderToolbar();

    expect(hasDisabledButton(markup, "上传文件")).toBe(false);
    expect(hasDisabledButton(markup, "上传文件夹")).toBe(false);
  });

  it("uses distinct but related green colors for the two upload buttons", () => {
    const markup = renderToolbar();

    const fileUploadClass = getButtonClass(markup, "上传文件");
    const folderUploadClass = getButtonClass(markup, "上传文件夹");

    expect(fileUploadClass).toContain("bg-emerald-500");
    expect(folderUploadClass).toContain("bg-green-500");
    expect(fileUploadClass).not.toBe(folderUploadClass);
  });

  it("keeps the upload file button visually idle while files are uploading", () => {
    uploadQueueActive = true;
    const markup = renderToolbar();

    const fileUploadClass = getButtonClass(markup, "上传文件");

    expect(fileUploadClass).not.toContain("loading");
    expect(hasDisabledButton(markup, "上传文件")).toBe(false);
  });

  it("disables file mutation controls while a rename is running", () => {
    renamingActive = true;
    const markup = renderToolbar();

    expect(hasDisabledButton(markup, "上传文件")).toBe(true);
    expect(hasDisabledButton(markup, "上传文件夹")).toBe(true);
    expect(hasDisabledButton(markup, "新建文本文件")).toBe(true);
    expect(hasDisabledButton(markup, "新建文件夹")).toBe(true);
  });

  it("renders a sort dropdown with time selected by default", () => {
    const markup = renderToolbar();

    expect(hasButton(markup, "排序方式")).toBe(true);
    expect(hasButton(markup, "按时间排序")).toBe(true);
    expect(hasButton(markup, "按名称排序")).toBe(true);
    expect(hasButton(markup, "按大小排序")).toBe(true);
    expect(getButtonTag(markup, "按时间排序")).toContain('aria-current="true"');
  });

  it("describes the current sort method in the sort button tooltip", () => {
    const markup = renderToolbar();

    expect(markup).toContain('data-tip="当前排序：按时间排序（降序）"');
  });
});
