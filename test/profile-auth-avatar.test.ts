import { beforeEach, describe, expect, it, vi } from "vitest";

const getFileContextMock = vi.fn();

vi.mock("../src/worker/utils/appHelpers", () => ({
  getFileContext: getFileContextMock,
}));

describe("profile auth avatar proxy", () => {
  beforeEach(() => {
    getFileContextMock.mockReset();
    vi.restoreAllMocks();
  });

  it("proxies google auth avatars through the worker", async () => {
    getFileContextMock.mockResolvedValue({
      rootDirId: "root-dir",
      user: {
        id: "user-1",
        email: "test1@tingyuan.in",
        name: "test1",
        emailVerified: true,
        image: "https://lh3.googleusercontent.com/avatar",
      },
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("avatar-bytes", {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
        },
      }),
    );

    const { default: profile } = await import("../src/worker/routes/profile");
    const response = await profile.request("http://localhost/api/profile/auth-avatar");

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("avatar-bytes");
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toBe("private, max-age=3600");
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://lh3.googleusercontent.com/avatar");
  });

  it("rejects non-google auth avatar hosts", async () => {
    getFileContextMock.mockResolvedValue({
      rootDirId: "root-dir",
      user: {
        id: "user-1",
        email: "test1@tingyuan.in",
        name: "test1",
        emailVerified: true,
        image: "https://example.com/avatar.png",
      },
    });

    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { default: profile } = await import("../src/worker/routes/profile");
    const response = await profile.request("http://localhost/api/profile/auth-avatar");

    expect(response.status).toBe(404);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
