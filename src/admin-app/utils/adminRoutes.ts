export const ADMIN_ROOT_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_USERS_PATH = "/admin/users";

const ALLOWED_REDIRECT_PATHS = new Set([ADMIN_USERS_PATH, `${ADMIN_USERS_PATH}/`]);
const LOCAL_URL_BASE = "https://fileyard.local";

export function sanitizeAdminRedirectTarget(value: string | null | undefined): string {
  const target = value?.trim();
  if (!target) {
    return ADMIN_USERS_PATH;
  }

  let url: URL;
  try {
    url = new URL(target, LOCAL_URL_BASE);
  } catch {
    return ADMIN_USERS_PATH;
  }

  if (url.origin !== LOCAL_URL_BASE) {
    return ADMIN_USERS_PATH;
  }

  if (url.pathname === ADMIN_ROOT_PATH || url.pathname === `${ADMIN_ROOT_PATH}/`) {
    return ADMIN_USERS_PATH;
  }

  if (!ALLOWED_REDIRECT_PATHS.has(url.pathname)) {
    return ADMIN_USERS_PATH;
  }

  return `${ADMIN_USERS_PATH}${url.search}${url.hash}`;
}

export function buildAdminLoginHref(redirectTo: string | null | undefined = ADMIN_USERS_PATH) {
  const params = new URLSearchParams({
    redirectTo: sanitizeAdminRedirectTarget(redirectTo),
  });

  return `${ADMIN_LOGIN_PATH}?${params.toString()}`;
}
