import { describe, expect, it } from "vitest";
import { getPasswordErrors, PASSWORD_REQUIREMENTS_HINT } from "../src/react-app/utils/passwordRules";
import { validatePassword } from "../src/worker/utils/password";

describe("password policy", () => {
  it("requires at least 12 characters plus uppercase, lowercase, and number on the backend", () => {
    expect(validatePassword("Password12")).toMatchObject({
      valid: false,
      errors: ["Password must be at least 12 characters long"],
    });

    expect(validatePassword("ValidPassword1")).toMatchObject({
      valid: true,
      errors: [],
    });
  });

  it("uses the same 12-character policy in frontend hints and validation", () => {
    expect(getPasswordErrors("Password12")).toEqual(["At least 12 characters"]);
    expect(getPasswordErrors("ValidPassword1")).toEqual([]);
    expect(PASSWORD_REQUIREMENTS_HINT).toBe(
      "12-64 characters, must include uppercase, lowercase, and number",
    );
  });
});
