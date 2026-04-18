import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ShareLinkCopyButton } from "../src/react-app/components/ShareLinkCopyButton";

function renderButton(isCopied: boolean) {
  return renderToStaticMarkup(
    createElement(ShareLinkCopyButton, {
      isCopied,
      onClick: vi.fn(),
    }),
  );
}

describe("share link copy button", () => {
  it("renders the idle copy state by default", () => {
    const markup = renderButton(false);

    expect(markup).toContain(">复制<");
    expect(markup).toContain("btn-ghost");
    expect(markup).toContain('data-copy-state="idle"');
    expect(markup).toContain('aria-live="polite"');
  });

  it("renders the copied feedback state as a success icon without changing background", () => {
    const markup = renderButton(true);

    expect(markup).not.toContain(">已复制<");
    expect(markup).toContain("btn-ghost");
    expect(markup).not.toContain("btn-success");
    expect(markup).toContain('aria-label="已复制"');
    expect(markup).toContain("text-success");
    expect(markup).toContain("data-testid=\"copy-success-icon\"");
    expect(markup).toContain('data-copy-state="copied"');
  });
});
