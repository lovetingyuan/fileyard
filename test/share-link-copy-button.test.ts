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

  it("renders the copied feedback state with a highlighted style", () => {
    const markup = renderButton(true);

    expect(markup).toContain(">已复制<");
    expect(markup).toContain("btn-success");
    expect(markup).toContain('data-copy-state="copied"');
  });
});
