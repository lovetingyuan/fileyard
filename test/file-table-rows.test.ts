import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FolderRow } from "../src/react-app/components/FileTableRows";

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

describe("file table rows", () => {
  it("renders folder names in bold", () => {
    const markup = renderToStaticMarkup(
      createElement(FolderRow, {
        folder: {
          name: "Projects",
          path: "Projects",
          createdAt: "2026-04-19T00:00:00.000Z",
        },
        busy: false,
        isDeletingFolder: false,
        onNavigate: vi.fn(),
        onShowDetails: vi.fn(),
        onRequestDelete: vi.fn(),
      }),
    );

    expect(markup).toContain("Projects");
    expect(markup).toContain("font-bold");
  });
});
