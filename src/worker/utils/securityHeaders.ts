const LOCAL_DEVELOPMENT_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function shouldSkipContentSecurityPolicy(url: string): boolean {
  return LOCAL_DEVELOPMENT_HOSTS.has(new URL(url).hostname);
}

export function applySecurityHeaders(headers: Headers, options?: { skipCSP?: boolean }): void {
  if (!options?.skipCSP) {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "media-src 'self' blob:",
        "connect-src 'self' https://api.iconify.dev",
        "frame-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
      ].join("; "),
    );
  }
  headers.set("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
}
