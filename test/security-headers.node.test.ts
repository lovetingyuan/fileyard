import { describe, expect, it } from "vitest";
import { applySecurityHeadersToResponse } from "../src/worker/utils/securityHeaders";

describe("security header response handling", () => {
  it("adds headers to immutable fetch responses without changing auth error payloads", async () => {
    const response = await fetch(
      "data:application/json,%7B%22code%22%3A%22INVALID_EMAIL_OR_PASSWORD%22%7D",
    );

    const updatedResponse = applySecurityHeadersToResponse(
      response,
      "http://localhost/api/auth/sign-in/email",
    );

    expect(updatedResponse).not.toBe(response);
    expect(updatedResponse.status).toBe(200);
    expect(updatedResponse.headers.get("X-Frame-Options")).toBe("DENY");
    await expect(updatedResponse.clone().json()).resolves.toMatchObject({
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
  });
});
