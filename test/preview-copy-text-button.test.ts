import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PreviewCopyTextButton } from "../src/react-app/pages/dashboard/components/PreviewModal";

vi.mock("~icons/mdi/check", () => ({
  default: () => createElement("svg", { "data-testid": "copy-success-icon" }),
}));
vi.mock("~icons/mdi/close", () => ({ default: () => null }));
vi.mock("~icons/mdi/content-copy", () => ({
  default: () => createElement("svg", { "data-testid": "copy-idle-icon" }),
}));
vi.mock("~icons/mdi/file-alert-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/fullscreen", () => ({ default: () => null }));
vi.mock("~icons/mdi/fullscreen-exit", () => ({ default: () => null }));
vi.mock("~icons/mdi/pencil", () => ({ default: () => null }));

function renderButton(isCopied: boolean) {
  return renderToStaticMarkup(
    createElement(PreviewCopyTextButton, {
      disabled: false,
      isCopied,
      onClick: vi.fn(),
    }),
  );
}

describe("preview copy text button", () => {
  it("renders the idle copy state", () => {
    const markup = renderButton(false);

    expect(markup).toContain("btn-ghost");
    expect(markup).not.toContain("btn-success");
    expect(markup).toContain('data-copy-state="idle"');
    expect(markup).toContain("复制文本");
    expect(markup).toContain('data-testid="copy-idle-icon"');
  });

  it("renders copied feedback without changing the button type", () => {
    const markup = renderButton(true);

    expect(markup).toContain("btn-ghost");
    expect(markup).not.toContain("btn-success");
    expect(markup).toContain("text-success");
    expect(markup).toContain('data-copy-state="copied"');
    expect(markup).toContain("已复制");
    expect(markup).toContain('aria-label="文本已复制"');
    expect(markup).toContain('data-testid="copy-success-icon"');
  });
});
