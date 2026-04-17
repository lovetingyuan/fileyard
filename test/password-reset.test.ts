/// <reference types="@cloudflare/vitest-pool-workers/types" />

import { env } from "cloudflare:workers";
import { runInDurableObject, SELF } from "cloudflare:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgotPassword } from "../src/react-app/pages/ForgotPassword";
import { Login } from "../src/react-app/pages/Login";
import { ResetPassword } from "../src/react-app/pages/ResetPassword";
import { allowsAuthenticatedEmailActionPath } from "../src/react-app/utils/authRouteAccess";
import { generateSalt, hashPassword } from "../src/worker/utils/password";

const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockResetPasswordTokenValidation = vi.fn();

type VerificationToken = {
  token: string;
  type: "email" | "password";
  createdAt: number;
  expiresAt: number;
};

function encodeVerificationCode(email: string, token: string): string {
  const raw = `${email}:${token}`;
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}

vi.mock("react-hot-toast", () => ({
  default: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

vi.mock("../src/react-app/hooks/useAuthApi", async () => {
  const actual = await vi.importActual<typeof import("../src/react-app/hooks/useAuthApi")>(
    "../src/react-app/hooks/useAuthApi",
  );

  return {
    ...actual,
    useResetPasswordTokenValidation: (...args: unknown[]) =>
      mockResetPasswordTokenValidation(...args),
  };
});

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
  return `reset-${crypto.randomUUID()}@example.com`;
}

async function createUser(
  email = createEmailAddress(),
  password = "Password123A",
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

  headers.set("CF-Connecting-IP", options.ip ?? "203.0.113.30");

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

describe("password reset backend", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockResetPasswordTokenValidation.mockReset();
    mockResetPasswordTokenValidation.mockReturnValue({
      isValid: true,
      error: undefined,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends a reset-password email for verified users", async () => {
    const { email } = await createUser(undefined, undefined, { verified: true });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: expect.stringContaining("reset"),
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy.mock.calls[0]?.[0]).toBe("https://api.resend.com/emails");
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
    });
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain("/reset-password/");
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain("expire in 30 minutes");
  });

  it("creates email and password tokens that expire within 30 minutes", async () => {
    const { stub } = await createUser();
    const emailToken = await stub.createVerificationToken("email");
    const passwordToken = await stub.createVerificationToken("password");

    await runInDurableObject(stub, async (_instance, state) => {
      const emailVerificationToken = await state.storage.get<VerificationToken>(
        `verify:${emailToken}`,
      );
      const passwordVerificationToken = await state.storage.get<VerificationToken>(
        `verify:${passwordToken}`,
      );

      expect(emailVerificationToken).toBeTruthy();
      expect(passwordVerificationToken).toBeTruthy();
      expect(emailVerificationToken!.expiresAt - emailVerificationToken!.createdAt).toBe(
        30 * 60 * 1000,
      );
      expect(passwordVerificationToken!.expiresAt - passwordVerificationToken!.createdAt).toBe(
        30 * 60 * 1000,
      );
    });
  });

  it("falls back to the request origin when APP_URL is empty", async () => {
    const { email } = await createUser(undefined, undefined, { verified: true });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const previousAppUrl = env.APP_URL;

    (env as Record<string, string>).APP_URL = "";

    try {
      const response = await apiFetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
        { ip: "203.0.113.31" },
      );

      expect(response.status).toBe(200);
      expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain(
        "https://example.com/reset-password/",
      );
    } finally {
      (env as Record<string, string>).APP_URL = previousAppUrl;
    }
  });

  it("keeps unknown accounts opaque when requesting a reset", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: createEmailAddress() }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: expect.stringContaining("If an account exists"),
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns a verify-email next action for unverified accounts", async () => {
    const { email } = await createUser();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = await apiFetch("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      nextAction: "verify-email",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects email-verification tokens on reset-password", async () => {
    const { email, stub } = await createUser(undefined, undefined, { verified: true });
    const token = await stub.createVerificationToken("email");
    const code = encodeVerificationCode(email, token);

    const response = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, password: "Password123B" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("token"),
    });
  });

  it("rejects expired reset-password tokens", async () => {
    const { email, stub } = await createUser(undefined, undefined, { verified: true });
    const token = await stub.createVerificationToken("password");
    const code = encodeVerificationCode(email, token);

    await runInDurableObject(stub, async (_instance, state) => {
      const storedToken = await state.storage.get<VerificationToken>(`verify:${token}`);
      if (!storedToken) {
        throw new Error("Expected stored token");
      }

      storedToken.expiresAt = Date.now() - 1;
      await state.storage.put(`verify:${token}`, storedToken);
    });

    const response = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, password: "Password123B" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("expired"),
    });
  });

  it("updates the password, invalidates prior sessions, and rejects token reuse", async () => {
    const { email, password, stub } = await createUser(undefined, undefined, { verified: true });
    const cookie = await createSessionCookie(email);
    const token = await stub.createVerificationToken("password");
    const code = encodeVerificationCode(email, token);

    const resetResponse = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, password: "Password123B" }),
    });

    expect(resetResponse.status).toBe(200);
    await expect(resetResponse.json()).resolves.toMatchObject({
      success: true,
      message: expect.stringContaining("reset"),
    });

    const meResponse = await apiFetch("/api/auth/me", {}, { cookie });
    expect(meResponse.status).toBe(401);

    const oldLoginResponse = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    expect(oldLoginResponse.status).toBe(400);

    const newLoginResponse = await apiFetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password: "Password123B" }),
    });
    expect(newLoginResponse.status).toBe(200);

    const reusedResponse = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, password: "Password123C" }),
    });
    expect(reusedResponse.status).toBe(400);
  });

  it("rejects reset-password validation for expired or already-used links", async () => {
    const { email, stub } = await createUser(undefined, undefined, { verified: true });
    const expiredToken = await stub.createVerificationToken("password");
    const expiredCode = encodeVerificationCode(email, expiredToken);

    await runInDurableObject(stub, async (_instance, state) => {
      const storedToken = await state.storage.get<VerificationToken>(`verify:${expiredToken}`);
      if (!storedToken) {
        throw new Error("Expected stored token");
      }

      storedToken.expiresAt = Date.now() - 1;
      await state.storage.put(`verify:${expiredToken}`, storedToken);
    });

    const expiredResponse = await apiFetch("/api/auth/reset-password/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: expiredCode }),
    });

    expect(expiredResponse.status).toBe(400);
    await expect(expiredResponse.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("expired"),
    });

    const usedToken = await stub.createVerificationToken("password");
    const usedCode = encodeVerificationCode(email, usedToken);

    const resetResponse = await apiFetch("/api/auth/reset-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: usedCode, password: "Password123B" }),
    });
    expect(resetResponse.status).toBe(200);

    const usedResponse = await apiFetch("/api/auth/reset-password/validate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code: usedCode }),
    });

    expect(usedResponse.status).toBe(400);
    await expect(usedResponse.json()).resolves.toMatchObject({
      success: false,
      error: expect.stringContaining("expired"),
    });
  });

  it("rate limits repeated forgot-password and reset-password attempts", async () => {
    const { email, stub } = await createUser(undefined, undefined, { verified: true });
    const resetIp = "198.51.100.50";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await apiFetch(
        "/api/auth/forgot-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        },
        { ip: "198.51.100.40" },
      );

      expect(response.status).toBe(200);
    }

    const blockedForgotResponse = await apiFetch(
      "/api/auth/forgot-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      },
      { ip: "198.51.100.40" },
    );
    expect(blockedForgotResponse.status).toBe(429);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const token = await stub.createVerificationToken("password");
      const code = encodeVerificationCode(email, token);
      const response = await apiFetch(
        "/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code, password: "short" }),
        },
        { ip: resetIp },
      );

      expect(response.status).toBe(400);
    }

    const blockedResetResponse = await apiFetch(
      "/api/auth/reset-password",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: "invalid-code", password: "Password123B" }),
      },
      { ip: resetIp },
    );

    expect(blockedResetResponse.status).toBe(429);
    expect(blockedResetResponse.headers.get("Retry-After")).toBeTruthy();
  });
});

describe("password reset frontend markup", () => {
  beforeEach(() => {
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockResetPasswordTokenValidation.mockReset();
    mockResetPasswordTokenValidation.mockReturnValue({
      isValid: true,
      error: undefined,
      isLoading: false,
    });
  });

  it("allows authenticated users to open reset-password email action links", () => {
    expect(allowsAuthenticatedEmailActionPath("/reset-password/test-token")).toBe(true);
    expect(allowsAuthenticatedEmailActionPath("/login")).toBe(false);
  });

  it("renders the login page with a forgot-password entry point", () => {
    const markup = renderWithRouter(
      "/login?email=test1%40example.com",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/login",
          element: createElement(Login, { onSwitchToRegister: vi.fn() }),
        }),
      ),
    );

    expect(markup).toContain("Forgot password?");
    expect(markup).toContain('href="/forgot-password?email=test1%40example.com"');
  });

  it("shows a reset-success toast when login loads with the reset flag", async () => {
    renderWithRouter(
      "/login?reset=1",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/login",
          element: createElement(Login, { onSwitchToRegister: vi.fn() }),
        }),
      ),
    );

    await Promise.resolve();

    expect(mockToastSuccess).toHaveBeenCalledWith(
      expect.stringContaining("Password reset successful"),
    );
  });

  it("renders the forgot-password form with email autocomplete and prefilled query email", () => {
    const markup = renderWithRouter(
      "/forgot-password?email=test1%40example.com",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/forgot-password",
          element: createElement(ForgotPassword),
        }),
      ),
    );

    expect(markup).toContain('name="email"');
    expect(markup).toContain('autoComplete="email"');
    expect(markup).toContain('value="test1@example.com"');
    expect(markup).toContain("Reset password");
  });

  it("renders the reset-password form with new-password autocomplete", () => {
    const markup = renderWithRouter(
      "/reset-password/test-token",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/reset-password/:token",
          element: createElement(ResetPassword),
        }),
      ),
    );

    expect(markup).toContain('name="password"');
    expect(markup).toContain('name="confirmPassword"');
    expect(markup).toContain('autoComplete="new-password"');
    expect(markup).toContain("Confirm Password");
  });

  it("renders the reset-password invalid state when token validation fails", () => {
    mockResetPasswordTokenValidation.mockReturnValue({
      isValid: false,
      error: new Error("Invalid or expired reset token"),
      isLoading: false,
    });

    const markup = renderWithRouter(
      "/reset-password/used-token",
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: "/reset-password/:token",
          element: createElement(ResetPassword),
        }),
      ),
    );

    expect(markup).toContain("Invalid reset link");
    expect(markup).toContain("Request a new link");
  });
});
