import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetAuth, mockGetSession } = vi.hoisted(() => {
  const getSession = vi.fn();
  return {
    mockGetSession: getSession,
    mockGetAuth: vi.fn(() => ({
      api: {
        getSession,
      },
    })),
  };
});

vi.mock("../src/worker/auth", () => ({
  getAuth: mockGetAuth,
}));

import { authMiddleware } from "../src/worker/auth/middleware";

type SessionResult = {
  session: {
    id: string;
    userId: string;
  };
  user: {
    id: string;
    email: string;
  };
};

function createMockContext() {
  const values = new Map<string, unknown>();
  const request = new Request("http://localhost/api/files", {
    headers: {
      Cookie: "better-auth.session_token=test-token",
    },
  });

  return {
    req: {
      raw: request,
    },
    set: (key: string, value: unknown) => {
      values.set(key, value);
    },
    get: (key: string) => values.get(key),
  };
}

describe("authMiddleware", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetAuth.mockClear();
  });

  it("resolves Better Auth sessions from request headers without switching to Response mode", async () => {
    const sessionResult: SessionResult = {
      session: {
        id: "session-1",
        userId: "user-1",
      },
      user: {
        id: "user-1",
        email: "test1@example.com",
      },
    };
    const context = createMockContext();
    const next = vi.fn(async () => undefined);

    mockGetSession.mockResolvedValue(sessionResult);

    await authMiddleware()(
      context as Parameters<ReturnType<typeof authMiddleware>>[0],
      next as Parameters<ReturnType<typeof authMiddleware>>[1],
    );

    expect(mockGetSession).toHaveBeenCalledWith({
      headers: context.req.raw.headers,
    });
    expect(mockGetAuth).toHaveBeenCalledTimes(1);
    expect(context.get("session")).toEqual(sessionResult.session);
    expect(context.get("user")).toEqual(sessionResult.user);
    expect(next).toHaveBeenCalledOnce();
  });
});
