import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  AdminUsersPageView,
  type AdminUsersPageViewProps,
} from "../src/admin-app/components/AdminUsersPageView";

function renderAdminPage(props: Partial<AdminUsersPageViewProps> = {}) {
  return renderToStaticMarkup(
    createElement(AdminUsersPageView, {
      items: [],
      page: 1,
      pageSize: 20,
      total: 0,
      state: "ready",
      ...props,
    }),
  );
}

describe("admin users page view", () => {
  it("renders a loading state while the admin list is being fetched", () => {
    const markup = renderAdminPage({ state: "loading" });

    expect(markup).toContain("正在加载用户列表");
  });

  it("renders a login call to action for unauthenticated users", () => {
    const markup = renderAdminPage({ errorKind: "unauthorized", state: "error" });

    expect(markup).toContain("请先登录");
    expect(markup).toContain('href="/login"');
  });

  it("renders a forbidden state for non-admin users", () => {
    const markup = renderAdminPage({ errorKind: "forbidden", state: "error" });

    expect(markup).toContain("你没有管理员权限");
    expect(markup).not.toContain("<table");
  });

  it("renders users, missing last-login placeholders, and pagination links", () => {
    const markup = renderAdminPage({
      items: [
        {
          email: "admin@example.com",
          createdAt: "2026-04-01T08:00:00.000Z",
          lastLoginAt: null,
        },
      ],
      page: 1,
      pageSize: 20,
      total: 25,
    });

    expect(markup).toContain("admin@example.com");
    expect(markup).toContain("从未登录");
    expect(markup).toContain('href="/admin/users/?page=2&amp;pageSize=20"');
  });
});
