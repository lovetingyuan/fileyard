import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "../src/react-app/pages/Login";

const toastSuccess = vi.fn();

vi.mock("react-hot-toast", () => ({
  default: {
    success: (...args: unknown[]) => toastSuccess(...args),
    error: vi.fn(),
  },
}));

vi.mock("~icons/mdi/account-plus-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/alert-circle-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/email-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/lock-outline", () => ({ default: () => null }));
vi.mock("~icons/mdi/login", () => ({ default: () => null }));

vi.mock("../src/react-app/auth/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(),
    loginWithGoogle: vi.fn(),
    loading: false,
  }),
}));

function renderLogin(path: string) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: [path] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/login",
          element: createElement(Login),
        }),
      ),
    ),
  );
}

describe("login auth feedback", () => {
  beforeEach(() => {
    toastSuccess.mockReset();
  });

  it("triggers registration success toast during render", async () => {
    renderLogin("/login?registered=1&email=test1%40tingyuan.in");
    await Promise.resolve();

    expect(toastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("Registration successful"),
      expect.objectContaining({ id: expect.stringContaining("registered") }),
    );
  });
});
