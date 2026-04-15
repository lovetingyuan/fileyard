import { describe, expect, it } from "vitest";
import { viteHtmlEntryPoints } from "../scripts/vite-entry-points";

describe("vite html entry points", () => {
  it("keeps the main app on index.html and adds an isolated admin users html entry", () => {
    expect(viteHtmlEntryPoints.main).toMatch(/index\.html$/);
    expect(viteHtmlEntryPoints.adminUsers).toMatch(/admin[\\/]users[\\/]index\.html$/);
  });
});
