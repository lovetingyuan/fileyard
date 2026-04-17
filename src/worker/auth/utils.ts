const DEFAULT_NAME = "User";
const MAX_AUTH_NAME_LENGTH = 64;

function sanitizeNameSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, " ").trim();
}

export function deriveAuthNameFromEmail(email: string): string {
  const normalizedEmail = email.trim().toLowerCase();
  const localPart = normalizedEmail.split("@")[0] ?? "";
  const sanitized = sanitizeNameSegment(localPart);

  if (!sanitized) {
    return DEFAULT_NAME;
  }

  return sanitized.slice(0, MAX_AUTH_NAME_LENGTH);
}
