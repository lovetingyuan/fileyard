import { describe, expect, it, vi } from "vitest";
import {
  isMissingRateLimitTableError,
  withRateLimitTableFallback,
} from "../src/worker/auth/rate-limit-fallback";

function createMissingRateLimitTableError() {
  return {
    cause: {
      message: "D1_ERROR: no such table: rate_limit: SQLITE_ERROR",
      cause: {
        message: "no such table: rate_limit: SQLITE_ERROR",
      },
    },
  };
}

describe("auth rate-limit fallback", () => {
  it("detects nested missing rate_limit table errors", () => {
    expect(isMissingRateLimitTableError(createMissingRateLimitTableError())).toBe(true);
    expect(isMissingRateLimitTableError(new Error("something else"))).toBe(false);
  });

  it("retries with the fallback handler when rate_limit table is missing", async () => {
    const fallback = vi.fn(async () => new Response("ok", { status: 200 }));
    const logger = vi.fn();

    const response = await withRateLimitTableFallback(
      async () => {
        throw createMissingRateLimitTableError();
      },
      fallback,
      logger,
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
    expect(fallback).toHaveBeenCalledOnce();
    expect(logger).toHaveBeenCalledOnce();
  });

  it("does not swallow unrelated auth errors", async () => {
    const fallback = vi.fn(async () => new Response("ok", { status: 200 }));
    const error = new Error("boom");

    await expect(
      withRateLimitTableFallback(async () => {
        throw error;
      }, fallback),
    ).rejects.toThrow("boom");

    expect(fallback).not.toHaveBeenCalled();
  });
});
