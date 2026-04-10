import { describe, expect, it } from "vitest";
import { applySecurityHeaders } from "../src/worker/utils/securityHeaders";

describe("applySecurityHeaders", () => {
  it("sets a content security policy header", () => {
    const headers = new Headers();

    applySecurityHeaders(headers);

    expect(headers.has("Content-Security-Policy")).toBe(true);
    expect(headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
  });
});
