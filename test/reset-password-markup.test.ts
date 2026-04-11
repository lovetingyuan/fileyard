import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ResetPassword } from "../src/react-app/pages/ResetPassword";

vi.mock("../src/react-app/hooks/useAuthApi", () => ({
  useResetPasswordMutation: () => ({
    resetPassword: vi.fn(),
    isMutating: false,
  }),
}));

function renderWithRouter(path: string, element: React.ReactNode): string {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, element));
}

describe("reset password markup", () => {
  it("renders the reset-password form with the 12-character password policy", () => {
    const markup = renderWithRouter(
      "/reset-password?token=test-token",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/reset-password",
          element: createElement(ResetPassword),
        }),
      ),
    );

    expect(markup).toContain('name="password"');
    expect(markup).toContain('name="confirmPassword"');
    expect(markup).toContain('autoComplete="new-password"');
    expect(markup).toContain('minLength="12"');
    expect(markup).toContain("12-64 characters, must include uppercase, lowercase, and number");
  });
});
