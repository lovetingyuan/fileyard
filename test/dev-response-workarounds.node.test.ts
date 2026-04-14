import { describe, expect, it } from "vitest";
import { normalizeDevPostUnauthorizedResponse } from "../src/worker/utils/devResponseWorkarounds";

describe("dev unauthorized response workaround", () => {
  it("rewrites localhost post 401 responses to 400", async () => {
    const response = new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const updatedResponse = normalizeDevPostUnauthorizedResponse(
      response,
      "POST",
      "http://localhost/api/auth/sign-in/email",
    );

    expect(updatedResponse.status).toBe(400);
    await expect(updatedResponse.clone().json()).resolves.toMatchObject({
      error: "Unauthorized",
    });
  });

  it("keeps non-post unauthorized responses unchanged", () => {
    const response = new Response(null, { status: 401 });
    const updatedResponse = normalizeDevPostUnauthorizedResponse(
      response,
      "GET",
      "http://localhost/api/profile",
    );

    expect(updatedResponse.status).toBe(401);
    expect(updatedResponse).toBe(response);
  });
});
