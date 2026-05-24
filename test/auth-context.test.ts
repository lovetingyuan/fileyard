import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../src/react-app/auth/useAuth";
import { getStoreMethods } from "../src/react-app/store";

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

function captureAuth() {
  let captured: ReturnType<typeof useAuth> | null = null;

  renderToStaticMarkup(
    createElement(() => {
      captured = useAuth();
      return null;
    }),
  );

  if (!captured) {
    throw new Error("Expected auth hook result");
  }

  return captured;
}

describe("useAuth logout", () => {
  beforeEach(() => {
    mockMutateAuth.mockClear();
    mockTriggerLogout.mockClear();
    getStoreMethods().setAuthError(null);
    getStoreMethods().setAuthMutating(false);
  });

  it("navigates to the homepage after logout succeeds in the browser", async () => {
    const assign = vi.fn();

    vi.stubGlobal("window", {
      location: {
        assign,
      },
    });

    try {
      const auth = captureAuth();

      await auth.logout();

      expect(mockTriggerLogout).toHaveBeenCalledOnce();
      expect(assign).toHaveBeenCalledWith("/");
      expect(mockMutateAuth).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
