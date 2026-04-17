import { describe, expect, it } from "vitest";
import viteConfigSource from "../vite.config.ts?raw";

describe("vite config Better Auth password resolution", () => {
  it("does not force Better Auth password utils to the Node-only implementation", () => {
    expect(viteConfigSource).not.toContain("find: /^@better-auth\\/utils\\/password$/");
    expect(viteConfigSource).not.toContain("password.node.mjs");
  });
});
