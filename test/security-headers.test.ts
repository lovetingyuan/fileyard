import { describe, expect, it } from "vitest";
import { applySecurityHeaders } from "../src/worker/utils/securityHeaders";

describe("applySecurityHeaders", () => {
  it("does not set a content security policy header", () => {
    const headers = new Headers();

    applySecurityHeaders(headers);

    expect(headers.has("Content-Security-Policy")).toBe(false);
  });
});
