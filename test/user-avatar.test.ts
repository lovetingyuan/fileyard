import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { UserAvatar } from "../src/react-app/components/UserAvatar";

describe("UserAvatar", () => {
  it("prefers uploaded avatar over auth provider image", () => {
    const markup = renderToStaticMarkup(
      createElement(UserAvatar, {
        email: "test1@tingyuan.in",
        avatarUrl: "/api/profile/avatar?v=1",
        authImage: "https://lh3.googleusercontent.com/avatar",
      } as any),
    );

    expect(markup).toContain('src="/api/profile/avatar?v=1"');
    expect(markup).not.toContain("https://lh3.googleusercontent.com/avatar");
  });

  it("uses auth provider image when uploaded avatar is missing", () => {
    const authImage = "https://lh3.googleusercontent.com/avatar";
    const markup = renderToStaticMarkup(
      createElement(UserAvatar, {
        email: "test1@tingyuan.in",
        authImage,
      } as any),
    );

    expect(markup).toContain(
      `src="/api/profile/auth-avatar?v=${encodeURIComponent(authImage)}"`,
    );
  });

  it("falls back to the email initial when no image is available", () => {
    const markup = renderToStaticMarkup(
      createElement(UserAvatar, {
        email: "test1@tingyuan.in",
      }),
    );

    expect(markup).toContain(">T<");
  });
});
