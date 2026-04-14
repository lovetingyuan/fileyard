const EXPECTED_CREDENTIAL_FAILURE_MESSAGES = new Set([
  "User not found",
  "Credential account not found",
  "Password not found",
  "Invalid password",
]);

type BetterAuthLogLevel = "debug" | "info" | "warn" | "error";

type BetterAuthLogWriterOptions = {
  isDevelopment: boolean;
  write: (level: BetterAuthLogLevel, message: string, ...args: unknown[]) => void;
};

export function isExpectedCredentialFailureLog(message: string): boolean {
  return EXPECTED_CREDENTIAL_FAILURE_MESSAGES.has(message);
}

export function createBetterAuthLogWriter(options: BetterAuthLogWriterOptions) {
  return (level: BetterAuthLogLevel, message: string, ...args: unknown[]) => {
    const nextLevel =
      options.isDevelopment && level === "error" && isExpectedCredentialFailureLog(message)
        ? "warn"
        : level;

    options.write(nextLevel, message, ...args);
  };
}

function writeToConsole(level: BetterAuthLogLevel, message: string, ...args: unknown[]) {
  const logger =
    level === "debug"
      ? console.debug
      : level === "info"
        ? console.info
        : level === "warn"
          ? console.warn
          : console.error;

  logger(`[Better Auth] ${message}`, ...args);
}

export function createBetterAuthLogger(isDevelopment: boolean) {
  return {
    level: "warn" as const,
    log: createBetterAuthLogWriter({
      isDevelopment,
      write: writeToConsole,
    }),
  };
}
