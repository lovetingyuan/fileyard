import assert from "node:assert/strict";
import test from "node:test";
import {
  createBetterAuthLogWriter,
  isExpectedCredentialFailureLog,
} from "../src/worker/auth/logger.ts";

test("detects expected credential failure messages", () => {
  assert.equal(isExpectedCredentialFailureLog("Invalid password"), true);
  assert.equal(isExpectedCredentialFailureLog("User not found"), true);
  assert.equal(isExpectedCredentialFailureLog("Credential account not found"), true);
  assert.equal(isExpectedCredentialFailureLog("Some other auth error"), false);
});

test("downgrades expected credential failures in development", () => {
  const calls: Array<{ level: string; message: string; args: unknown[] }> = [];
  const writer = createBetterAuthLogWriter({
    isDevelopment: true,
    write: (level, message, ...args) => {
      calls.push({ level, message, args });
    },
  });

  writer("error", "Invalid password");
  writer("error", "User not found", { email: "x@example.com" });

  assert.deepEqual(calls, [
    { level: "warn", message: "Invalid password", args: [] },
    {
      level: "warn",
      message: "User not found",
      args: [{ email: "x@example.com" }],
    },
  ]);
});

test("preserves non-credential errors", () => {
  const calls: Array<{ level: string; message: string; args: unknown[] }> = [];
  const writer = createBetterAuthLogWriter({
    isDevelopment: true,
    write: (level, message, ...args) => {
      calls.push({ level, message, args });
    },
  });

  writer("error", "Database connection lost", { code: "ECONNRESET" });

  assert.deepEqual(calls, [
    {
      level: "error",
      message: "Database connection lost",
      args: [{ code: "ECONNRESET" }],
    },
  ]);
});
