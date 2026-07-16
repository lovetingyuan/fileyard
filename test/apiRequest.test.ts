import { describe, expect, it, vi } from "vitest";
import { ApiError, apiRequest } from "../src/react-app/utils/apiRequest";

describe("apiRequest", () => {
  it("includes a valid X-Retry-After value in ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Too many requests" }), {
          status: 429,
          headers: {
            "content-type": "application/json",
            "X-Retry-After": "60",
          },
        }),
      ),
    );

    await expect(apiRequest("/api/test")).rejects.toMatchObject<ApiError>({
      status: 429,
      retryAfterSeconds: 60,
    });

    vi.unstubAllGlobals();
  });

  it.each([null, "60.5", "-1", "1e2", "9007199254740992"])(
    "omits invalid X-Retry-After value %s",
    async retryAfter => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(null, {
            status: 429,
            headers: retryAfter === null ? undefined : { "X-Retry-After": retryAfter },
          }),
        ),
      );

      await expect(apiRequest("/api/test")).rejects.toMatchObject<ApiError>({
        status: 429,
        retryAfterSeconds: undefined,
      });

      vi.unstubAllGlobals();
    },
  );
});
