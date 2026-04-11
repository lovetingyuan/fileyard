const AUTHENTICATED_EMAIL_ACTION_PREFIXES = ["/reset-password/", "/verify/"];

export function allowsAuthenticatedEmailActionPath(pathname: string): boolean {
  return AUTHENTICATED_EMAIL_ACTION_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
