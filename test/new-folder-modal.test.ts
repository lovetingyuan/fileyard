import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeCreateFolder, startCreateFolder } from "../src/react-app/pages/dashboard/actions";
import { NewFolderModal } from "../src/react-app/pages/dashboard/components/NewFolderModal";
import { getStoreMethods } from "../src/react-app/store";

vi.mock("~icons/mdi/close", () => ({ default: () => null }));
vi.mock("react-hot-toast", () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("../src/react-app/hooks/useFilesApi", () => ({
  useCreateFolderMutation: () => ({ createFolder: vi.fn() }),
}));

vi.mock("../src/react-app/pages/dashboard/hooks/useDashboardFileView", () => ({
  useDashboardFileView: () => ({
    addOptimisticFolder: vi.fn(() => "新建文件夹"),
    refresh: vi.fn(),
    removeOptimisticFolder: vi.fn(),
  }),
}));

vi.mock("../src/react-app/pages/dashboard/hooks/useDashboardPath", () => ({
  useDashboardPath: () => ({
    currentPath: "",
  }),
}));

function resetStore() {
  const methods = getStoreMethods();

  methods.setIsCreatingNewFolder(false);
  methods.setCreatingFolder(false);
  methods.setAddNewFolderName("");
}

function renderNewFolderModal(): string {
  return renderToStaticMarkup(createElement(NewFolderModal));
}

function getCreateButtonTag(markup: string): string {
  return /<button(?=[^>]*>创建<\/button>)[^>]*>创建<\/button>/.exec(markup)?.[0] ?? "";
}

describe("NewFolderModal", () => {
  beforeEach(() => {
    resetStore();
  });

  it("does not render while folder creation is closed", () => {
    expect(renderNewFolderModal()).toBe("");
  });

  it("renders the default folder name and create action when opened", () => {
    startCreateFolder("新建文件夹");

    const markup = renderNewFolderModal();

    expect(markup).toContain("新建文件夹");
    expect(markup).toContain('value="新建文件夹"');
    expect(getCreateButtonTag(markup)).not.toContain("disabled");
  });

  it("disables create and shows validation when the folder name is empty", () => {
    startCreateFolder("");

    const markup = renderNewFolderModal();

    expect(markup).toContain("Folder name cannot be empty");
    expect(getCreateButtonTag(markup)).toContain("disabled");
  });

  it("disables create and shows validation when the folder name is invalid", () => {
    startCreateFolder("bad/name");

    const markup = renderNewFolderModal();

    expect(markup).toContain('Folder name cannot contain &quot;/&quot;');
    expect(getCreateButtonTag(markup)).toContain("disabled");

    closeCreateFolder();
  });
});
