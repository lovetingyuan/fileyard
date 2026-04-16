import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUseSession, mockSignInEmail } = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockSignInEmail: vi.fn(),
}));

vi.mock("../src/react-app/lib/auth-client", () => ({
  authClient: {
    useSession: mockUseSession,
    signIn: {
      email: mockSignInEmail,
    },
  },
}));

import { useLoginMutation } from "../src/react-app/hooks/useAuthApi";

function captureLoginMutation() {
  let captured: ReturnType<typeof useLoginMutation> | null = null;

  renderToStaticMarkup(
    createElement(() => {
      captured = useLoginMutation();
      return null;
    }),
  );

  if (!captured) {
    throw new Error("Expected login mutation");
  }

  return captured;
}

describe("useLoginMutation", () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    mockSignInEmail.mockReset();
    mockUseSession.mockReturnValue({
      data: null,
      error: null,
      isPending: false,
      refetch: vi.fn(),
    });
  });

  it("surfaces Better Auth error messages through the thrown Error", async () => {
    mockSignInEmail.mockResolvedValue({
      data: null,
      error: {
        message: "Invalid email or password",
      },
    });

    const { login } = captureLoginMutation();

    await expect(login("test1@example.com", "WrongPassword123A")).rejects.toThrow(
      "Invalid email or password",
    );
    expect(mockSignInEmail).toHaveBeenCalledWith({
      email: "test1@example.com",
      password: "WrongPassword123A",
      callbackURL: "/login?verified=1",
    });
  });
});
