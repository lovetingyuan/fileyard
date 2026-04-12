const MISSING_RATE_LIMIT_TABLE_PATTERN = /no such table:\s*rate_limit/i;

function collectErrorMessages(error: unknown, messages: Set<string>, depth = 0): void {
  if (depth > 5 || error == null) {
    return;
  }

  if (typeof error === "string") {
    messages.add(error);
    return;
  }

  if (error instanceof Error) {
    messages.add(error.message);
  }

  if (typeof error === "object") {
    const candidate = error as {
      cause?: unknown;
      message?: unknown;
      query?: unknown;
    };

    if (typeof candidate.message === "string") {
      messages.add(candidate.message);
    }

    if (typeof candidate.query === "string") {
      messages.add(candidate.query);
    }

    collectErrorMessages(candidate.cause, messages, depth + 1);
  }
}

export function isMissingRateLimitTableError(error: unknown): boolean {
  const messages = new Set<string>();
  collectErrorMessages(error, messages);
  return [...messages].some((message) => MISSING_RATE_LIMIT_TABLE_PATTERN.test(message));
}

export async function withRateLimitTableFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T>,
  log?: (error: unknown) => void,
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    if (!isMissingRateLimitTableError(error)) {
      throw error;
    }

    log?.(error);
    return fallback();
  }
}
