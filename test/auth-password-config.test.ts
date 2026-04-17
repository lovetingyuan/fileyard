import { describe, expect, it } from "vitest";
import { createBetterAuthOptions } from "../src/worker/auth/options";

describe("createBetterAuthOptions password hashing", () => {
  it("relies on Better Auth's default password hasher", () => {
    const options = createBetterAuthOptions({
      appName: "Fileyard",
      baseURL: "https://fileyard.tingyuan.in",
      secret: "12345678901234567890123456789012",
      googleClientId: "",
      googleClientSecret: "",
      trustedOrigins: [],
      sendVerificationEmail: async () => {},
      sendResetPassword: async () => {},
    });

    expect(options.emailAndPassword?.password).toBeUndefined();
  });
});
