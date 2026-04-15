import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Navigate, createRoutesFromElements, matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { buildAppRouteElements } from "../src/react-app/routes";
import { NotFound } from "../src/react-app/pages/NotFound";
import { renderProtectedRoute } from "../src/react-app/App";
import type { User } from "../src/react-app/hooks/useAuthApi";

function createUser(): User {
  return {
    id: "user-1",
    email: "test1@tingyuan.in",
    image: null,
    name: "test1",
    verified: true,
  };
}

describe("protected route rendering", () => {
  it("redirects unauthenticated users to /login", () => {
    const protectedElement = createElement("div", null, "protected");
    const result = renderProtectedRoute(null, protectedElement);

    expect(result.type).toBe(Navigate);
    expect(result.props.to).toBe("/login");
    expect(result.props.replace).toBe(true);
  });

  it("renders the protected element for authenticated users", () => {
    const protectedElement = createElement("div", { id: "dashboard" }, "protected");
    const result = renderProtectedRoute(createUser(), protectedElement);

    expect(result).toBe(protectedElement);
  });
});

describe("app route tree", () => {
  it("matches unknown paths to the not found page", () => {
    const routes = createRoutesFromElements(
      buildAppRouteElements({
        user: createUser(),
        authLoading: false,
        allowAuthenticatedEmailAction: false,
        onSwitchToLogin: () => undefined,
        onSwitchToRegister: () => undefined,
      }),
    );

    const matches = matchRoutes(routes, "/missing-page");
    const leafMatch = matches?.at(-1);

    expect(leafMatch?.route.path).toBe("*");
    expect(leafMatch?.route.element?.type).toBe(NotFound);
  });

  it("renders a homepage call to action on the not found page", () => {
    const markup = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(NotFound)));

    expect(markup).toContain("页面不存在");
    expect(markup).toContain("返回主页");
    expect(markup).toContain('href="/"');
  });
});
