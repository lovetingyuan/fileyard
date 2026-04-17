import { describe, expect, it, vi } from "vitest";
import type { TopBannerResponse } from "../src/types";
import app from "../src/worker";
import type { AppBindings } from "../src/worker/context";
import topBanner from "../src/worker/routes/topBanner";

function createEnv(message: string | null): AppBindings {
  return {
    FILE_YARD_KV: {
      get: vi.fn(async (key: string) => {
        expect(key).toBe("top_banner_message");
        return message;
      }),
    },
  } as unknown as AppBindings;
}

describe("top banner api", () => {
  it("waits for a slow KV read instead of returning null", async () => {
    vi.useFakeTimers();
    try {
      const responsePromise = topBanner.request(
        "http://localhost/api/top-banner",
        {},
        {
          FILE_YARD_KV: {
            get: vi.fn(
              () =>
                new Promise<string | null>((resolve) => {
                  setTimeout(
                    () =>
                      resolve(
                        JSON.stringify({
                          date: "20260418",
                          content: "<strong>Slow notice</strong>",
                          show: true,
                        }),
                      ),
                    1_501,
                  );
                }),
            ),
          },
        } as unknown as AppBindings,
      );

      await vi.advanceTimersByTimeAsync(1_500);
      await Promise.resolve();
      expect(await Promise.race([responsePromise, Promise.resolve("pending")])).toBe("pending");

      await vi.advanceTimersByTimeAsync(1);

      const response = await responsePromise;

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({
        success: true,
        banner: {
          date: "20260418",
          contentHtml: "<strong>Slow notice</strong>",
        },
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns the visible JSON banner from FILE_YARD_KV", async () => {
    const response = await topBanner.request(
      "http://localhost/api/top-banner",
      {},
      createEnv(
        JSON.stringify({
          date: "20260418",
          content: 'System maintenance <a href="/status">status</a>',
          show: true,
        }),
      ),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");

    const payload = (await response.json()) as TopBannerResponse;

    expect(payload).toEqual({
      success: true,
      banner: {
        date: "20260418",
        contentHtml: 'System maintenance <a href="/status">status</a>',
      },
    });
  });

  it("returns null when the KV message is missing, blank, hidden, or invalid", async () => {
    const missingResponse = await topBanner.request(
      "http://localhost/api/top-banner",
      {},
      createEnv(null),
    );

    expect(missingResponse.status).toBe(200);
    await expect(missingResponse.json()).resolves.toEqual({
      success: true,
      banner: null,
    });

    const blankResponse = await topBanner.request(
      "http://localhost/api/top-banner",
      {},
      createEnv("   \n  "),
    );

    expect(blankResponse.status).toBe(200);
    await expect(blankResponse.json()).resolves.toEqual({
      success: true,
      banner: null,
    });

    const hiddenResponse = await topBanner.request(
      "http://localhost/api/top-banner",
      {},
      createEnv(
        JSON.stringify({ date: "20260418", content: "<strong>Hidden</strong>", show: false }),
      ),
    );

    expect(hiddenResponse.status).toBe(200);
    await expect(hiddenResponse.json()).resolves.toEqual({
      success: true,
      banner: null,
    });

    const invalidResponse = await topBanner.request(
      "http://localhost/api/top-banner",
      {},
      createEnv("{not json"),
    );

    expect(invalidResponse.status).toBe(200);
    await expect(invalidResponse.json()).resolves.toEqual({
      success: true,
      banner: null,
    });
  });

  it("is registered as an unauthenticated endpoint on the main app", async () => {
    const response = await app.request(
      "http://localhost/api/top-banner",
      {},
      createEnv(
        JSON.stringify({ date: 20260418, content: "<strong>Public notice</strong>", show: true }),
      ),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      banner: {
        date: "20260418",
        contentHtml: "<strong>Public notice</strong>",
      },
    });
  });
});
