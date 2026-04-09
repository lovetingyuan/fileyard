export function applySecurityHeaders(headers: Headers): void {
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
}
