/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { SELF } from "cloudflare:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SharedFileMetadataResponse } from "../src/types";
import { Register } from "../src/react-app/pages/Register";
import { Login } from "../src/react-app/pages/Login";
import { ShareDownload } from "../src/react-app/pages/ShareDownload";
import { FileToolbar } from "../src/react-app/components/FileToolbar";
import { generateSalt, hashPassword } from "../src/worker/utils/password";

const mockUseSWR = vi.fn();

vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("../src/react-app/hooks/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(async () => ({ success: true })),
    register: vi.fn(async () => ({ success: true })),
    logout: vi.fn(async () => undefined),
    checkAuth: vi.fn(async () => undefined),
    user: null,
    authLoading: false,
    loading: false,
    error: null,
  }),
}));

function createEmailAddress(): string {
  return `hardening-${crypto.randomUUID()}@example.com`;
}

async function createUser(
  email = createEmailAddress(),
  password = "Password1",
  options?: { verified?: boolean },
) {
  const stub = env.USER_DO.getByName(email);
  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const result = await stub.createUser(email, passwordHash, salt);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to create user");
  }

  if (options?.verified) {
    await stub.verifyEmail();
  }

  return {
    email,
    password,
    stub,
  };
}

async function apiFetch(
  path: string,
  init: RequestInit = {},
  options: { cookie?: string; ip?: string } = {},
): Promise<Response> {
  const headers = new Headers(init.headers);

  if (options.cookie) {
    headers.set("Cookie", options.cookie);
  }

  if (init.method && init.method !== "GET" && init.method !== "HEAD") {
    headers.set("Origin", "https://example.com");
  }

  headers.set("CF-Connecting-IP", options.ip ?? "203.0.113.10");

  const response = await SELF.fetch(`https://example.com${path}`, {
    ...init,
    headers,
  });

  if (response.body) {
    void response
      .clone()
      .arrayBuffer()
      .catch(() => undefined);
  }

  return response;
}

async function createSessionCookie(email: string): Promise<string> {
  const stub = env.USER_DO.getByName(email);
  const session = await stub.createSession();
  return `session_token=${session.token}; user_email=${email}`;
}

function renderWithRouter(path: string, element: React.ReactNode): string {
  return renderToStaticMarkup(createElement(MemoryRouter, { initialEntries: [path] }, element));
}

describe("release hardening backend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockUseSWR.mockReset();
  });

  it("sets secure auth cookies on https login responses", async () => {
    const { email, password } = await createUser(undefined, undefined, { verified: true });

    const response = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    expect(response.status).toBe(200);
    const setCookie = response.headers.get("Set-Cookie") ?? "";
    expect(setCookie).toContain("Secure");
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
  });

  it("rolls back registration if verification email delivery fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream failed", { status: 502 }),
    );

    const email = createEmailAddress();
    const response = await apiFetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: "Password1" }),
    });

    expect(response.status).toBe(502);
    await expect(env.USER_DO.getByName(email).getUser()).resolves.toBeNull();
  });

  it("returns an actionable error when resend email delivery fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("upstream failed", { status: 500 }),
    );

    const { email } = await createUser();
    const response = await apiFetch("/api/auth/resend-verification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("verification"),
    });
  });

  it("rate limits repeated failed logins and share-link creation attempts", async () => {
    const { email, password } = await createUser(undefined, undefined, { verified: true });
    const loginIp = "198.51.100.10";

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await apiFetch(
        "/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password: "WrongPassword1" }),
        },
        { ip: loginIp },
      );

      expect(response.status).toBe(400);
    }

    const blockedLoginResponse = await apiFetch(
      "/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      },
      { ip: loginIp },
    );

    expect(blockedLoginResponse.status).toBe(429);
    expect(blockedLoginResponse.headers.get("Retry-After")).toBeTruthy();

    const cookie = await createSessionCookie(email);
    const uploadResponse = await apiFetch(
      "/api/files/object?name=share.txt",
      {
        method: "PUT",
        headers: {
          "Content-Length": String("hello share".length),
          "Content-Type": "text/plain",
        },
        body: "hello share",
      },
      { cookie, ip: "198.51.100.11" },
    );
    expect(uploadResponse.status).toBe(201);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await apiFetch(
        "/api/files/share-links",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ path: "share.txt", expiresInSeconds: 600 }),
        },
        { cookie, ip: "198.51.100.11" },
      );
      expect(response.status).toBe(200);
    }

    const blockedShareResponse = await apiFetch(
      "/api/files/share-links",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ path: "share.txt", expiresInSeconds: 600 }),
      },
      { cookie, ip: "198.51.100.11" },
    );

    expect(blockedShareResponse.status).toBe(429);
    expect(blockedShareResponse.headers.get("Retry-After")).toBeTruthy();
  });

  it("applies security headers to html, api, and download responses", async () => {
    const htmlResponse = await apiFetch("/login");
    expect(htmlResponse.status).toBe(200);
    expect(htmlResponse.headers.has("Content-Security-Policy")).toBe(true);
    expect(htmlResponse.headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(htmlResponse.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(htmlResponse.headers.get("Permissions-Policy")).toContain("camera=()");

    const { email } = await createUser(undefined, undefined, { verified: true });
    const cookie = await createSessionCookie(email);

    const apiResponse = await apiFetch("/api/auth/me", {}, { cookie });
    expect(apiResponse.status).toBe(200);
    expect(apiResponse.headers.get("X-Frame-Options")).toBe("DENY");
    expect(apiResponse.headers.get("X-Content-Type-Options")).toBe("nosniff");

    const uploadResponse = await apiFetch(
      "/api/files/object?name=security.txt",
      {
        method: "PUT",
        headers: {
          "Content-Length": String("secure".length),
          "Content-Type": "text/plain",
        },
        body: "secure",
      },
      { cookie },
    );
    expect(uploadResponse.status).toBe(201);

    const downloadResponse = await apiFetch("/api/files/object?path=security.txt", {}, { cookie });
    expect(downloadResponse.status).toBe(200);
    expect(downloadResponse.headers.get("X-Frame-Options")).toBe("DENY");
  });
});

describe("release hardening frontend markup", () => {
  beforeEach(() => {
    mockUseSWR.mockReset();
  });

  it("renders login and register forms with names and autocomplete attributes", () => {
    const loginMarkup = renderWithRouter(
      "/login",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/login",
          element: createElement(Login, { onSwitchToRegister: vi.fn() }),
        }),
      ),
    );

    expect(loginMarkup).toContain('name="email"');
    expect(loginMarkup).toContain('autoComplete="email"');
    expect(loginMarkup).toContain('name="password"');
    expect(loginMarkup).toContain('autoComplete="current-password"');

    const registerMarkup = renderWithRouter(
      "/register",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/register",
          element: createElement(Register, { onSwitchToLogin: vi.fn() }),
        }),
      ),
    );

    expect(registerMarkup).toContain('autoComplete="email"');
    expect(registerMarkup).toContain('autoComplete="new-password"');
    expect(registerMarkup).toContain('name="confirmPassword"');
  });

  it("renders file toolbar icon buttons with accessible labels", () => {
    const markup = renderToStaticMarkup(
      createElement(FileToolbar, {
        breadcrumbs: [],
        fileCount: 0,
        totalBytes: 0,
        busy: false,
        isUploadingFile: false,
        isCreatingFolder: false,
        isRefreshing: false,
        isCreatingNewFolder: false,
        searchQuery: "",
        isSearchPending: false,
        onSetPath: vi.fn(),
        onUploadClick: vi.fn(),
        onCreateFolder: vi.fn(),
        onCreateTextFile: vi.fn(),
        onRefresh: vi.fn(),
        onSearchChange: vi.fn(),
        onShowDirectoryStats: vi.fn(),
      }),
    );

    expect(markup).toContain('aria-label="上传文件"');
    expect(markup).toContain('aria-label="新建文本文件"');
    expect(markup).toContain('aria-label="新建文件夹"');
    expect(markup).toContain('aria-label="刷新文件列表"');
    expect(markup).toContain('aria-label="搜索文件"');
  });

  it("renders share downloads as direct links instead of blob-fetch buttons", () => {
    const shareMetadata: SharedFileMetadataResponse = {
      success: true,
      status: "active",
      fileName: "report.pdf",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      expiresInSeconds: 600,
      serverNow: new Date().toISOString(),
      downloadUrl: "/api/share-links/token/download",
    };

    mockUseSWR.mockReturnValue({
      data: shareMetadata,
      error: undefined,
      isLoading: false,
    });

    const markup = renderWithRouter(
      "/share/token",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/share/:token",
          element: createElement(ShareDownload),
        }),
      ),
    );

    expect(markup).toContain('href="/api/share-links/token/download"');
    expect(markup).toContain('download="report.pdf"');
    expect(markup).not.toContain(">下载文件</button>");
  });
});
