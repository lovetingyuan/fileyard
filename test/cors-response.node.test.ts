import { describe, expect, it } from "vitest";
import { applyCorsHeadersToResponse } from "../src/worker/utils/appHelpers";

describe("cors response handling", () => {
  it("adds cors headers to immutable fetch responses", async () => {
    const response = await fetch(
      "data:application/json,%7B%22code%22%3A%22INVALID_EMAIL_OR_PASSWORD%22%7D",
    );

    const updatedResponse = applyCorsHeadersToResponse(response, "http://localhost:5173");

    expect(updatedResponse).not.toBe(response);
    expect(updatedResponse.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
    await expect(updatedResponse.clone().json()).resolves.toMatchObject({
      code: "INVALID_EMAIL_OR_PASSWORD",
    });
  });
});
