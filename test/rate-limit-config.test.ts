import { describe, expect, it } from "vitest";
import wranglerConfig from "../wrangler.jsonc?raw";
import { createBetterAuthOptions } from "../src/worker/auth/options";

function createOptions() {
  return createBetterAuthOptions({
    appName: "Fileyard",
    baseURL: "http://localhost:5173",
    secret: "better-auth-development-secret-for-tests",
    googleClientId: "",
    googleClientSecret: "",
    trustedOrigins: ["http://localhost:5173"],
    sendVerificationEmail: async () => {},
    sendResetPassword: async () => {},
  });
}

describe("rate limit configuration", () => {
  it("uses Better Auth's built-in database-backed rate limit", () => {
    expect(createOptions().rateLimit).toMatchObject({
      storage: "database",
    });
  });

  it("does not keep the retired custom RateLimitDO worker migration", () => {
    expect(wranglerConfig).not.toContain("RateLimitDO");
    expect(wranglerConfig).not.toContain("new_sqlite_classes");
    expect(wranglerConfig).not.toContain("deleted_classes");
  });
});
