import { describe, expect, it } from "vitest";
import {
  applySecurityHeaders,
  shouldSkipContentSecurityPolicy,
} from "../src/worker/utils/securityHeaders";

describe("applySecurityHeaders", () => {
  it("sets a content security policy header", () => {
    const headers = new Headers();

    applySecurityHeaders(headers);

    expect(headers.has("Content-Security-Policy")).toBe(true);
    expect(headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
  });

  it("sets Strict-Transport-Security header", () => {
    const headers = new Headers();

    applySecurityHeaders(headers);

    expect(headers.get("Strict-Transport-Security")).toBe("max-age=31536000; includeSubDomains");
  });
});

describe("shouldSkipContentSecurityPolicy", () => {
  it("treats loopback dev hosts as local development", () => {
    expect(shouldSkipContentSecurityPolicy("http://localhost:4173/login")).toBe(true);
    expect(shouldSkipContentSecurityPolicy("http://127.0.0.1:4173/login")).toBe(true);
    expect(shouldSkipContentSecurityPolicy("http://[::1]:4173/login")).toBe(true);
    expect(shouldSkipContentSecurityPolicy("https://example.com/login")).toBe(false);
  });
});
