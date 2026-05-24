import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Profile } from "../src/react-app/pages/profile/Profile";

vi.mock("react-hot-toast", () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("~icons/mdi/arrow-left", () => ({ default: () => null }));
vi.mock("~icons/mdi/close", () => ({ default: () => null }));
vi.mock("~icons/mdi/github", () => ({ default: () => null }));
vi.mock("~icons/mdi/logout", () => ({ default: () => null }));

vi.mock("../src/react-app/auth/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      email: "test1@tingyuan.in",
      image: null,
      name: "test1",
      verified: true,
    },
    logout: vi.fn(),
    loading: false,
  }),
}));

vi.mock("../src/react-app/components/UserAvatar", () => ({
  UserAvatar: () => null,
}));

vi.mock("../src/react-app/hooks/useProfileApi", () => ({
  useProfile: () => ({
    profile: {
      email: "test1@tingyuan.in",
      avatarUrl: null,
    },
    isLoading: false,
  }),
  useUploadAvatar: () => ({
    uploadAvatar: vi.fn(),
    isMutating: false,
  }),
}));

function renderProfile() {
  return renderToStaticMarkup(createElement(MemoryRouter, null, createElement(Profile)));
}

describe("profile logout confirmation", () => {
  it("opens logout confirmation as a dialog instead of rendering dropdown confirmation", () => {
    const markup = renderProfile();

    expect(markup).toContain("退出登录");
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).not.toContain("dropdown-content");
    expect(markup).not.toContain("点击立即退出");
  });
});
