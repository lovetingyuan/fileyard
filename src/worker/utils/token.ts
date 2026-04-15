/**
 * Secure token generation utilities
 */

/**
 * Generate a cryptographically secure random token
 * @param length - Length in bytes (default 32, produces 64 hex chars)
 */
function generateToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a stable user root directory identifier for R2 object prefixes.
 */
export function generateRootDirId(): string {
  return generateToken(16);
}
