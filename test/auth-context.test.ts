import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../src/react-app/context/auth-context";
import { AuthProvider } from "../src/react-app/context/AuthContext";

const mockMutateAuth = vi.fn(async () => undefined);
const mockTriggerLogout = vi.fn(async () => undefined);

vi.mock("../src/react-app/hooks/useAuthApi", () => ({
  useAuthUser: () => ({
    user: null,
    error: null,
    isLoading: false,
    mutate: mockMutateAuth,
  }),
  useLoginMutation: () => ({
    login: vi.fn(async () => undefined),
    isMutating: false,
  }),
  useGoogleLoginMutation: () => ({
    loginWithGoogle: vi.fn(async () => undefined),
    isMutating: false,
  }),
  useLogoutMutation: () => ({
    logout: mockTriggerLogout,
    isMutating: false,
  }),
  useRegisterMutation: () => ({
    register: vi.fn(async () => ({ message: "ok" })),
    isMutating: false,
  }),
}));

function captureAuthContext() {
  let captured: React.ContextType<typeof AuthContext> = null;

  renderToStaticMarkup(
    createElement(
      AuthProvider,
      null,
      createElement(AuthContext.Consumer, null, (value) => {
        captured = value;
        return null;
      }),
    ),
  );

  if (!captured) {
    throw new Error("Expected auth context");
  }

  return captured;
}

describe("AuthProvider logout", () => {
  beforeEach(() => {
    mockMutateAuth.mockClear();
    mockTriggerLogout.mockClear();
  });

  it("navigates to the homepage after logout succeeds in the browser", async () => {
    const assign = vi.fn();

    vi.stubGlobal("window", {
      location: {
        assign,
      },
    });

    try {
      const auth = captureAuthContext();

      await auth.logout();

      expect(mockTriggerLogout).toHaveBeenCalledOnce();
      expect(assign).toHaveBeenCalledWith("/");
      expect(mockMutateAuth).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
