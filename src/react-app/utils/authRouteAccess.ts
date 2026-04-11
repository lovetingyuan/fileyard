const AUTHENTICATED_EMAIL_ACTION_PATHS = new Set(["/reset-password"]);

export function allowsAuthenticatedEmailActionPath(pathname: string): boolean {
  return AUTHENTICATED_EMAIL_ACTION_PATHS.has(pathname);
}
