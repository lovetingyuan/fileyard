import { describe, expect, it } from "vitest";
import { cloudflareOptimizeDepsExclude } from "../scripts/cloudflare-vite-config";

describe("cloudflare vite config", () => {
  it("excludes Cloudflare unenv runtime modules from dep optimization", () => {
    expect(cloudflareOptimizeDepsExclude).toEqual([
      "@cloudflare/unenv-preset/node/process",
      "@cloudflare/unenv-preset/polyfill/performance",
    ]);
  });
});
