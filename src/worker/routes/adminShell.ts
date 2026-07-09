const ADMIN_SHELL_PATHS = new Set([
  "/admin",
  "/admin/",
  "/admin/login",
  "/admin/users",
  "/admin/users/",
]);

const ADMIN_SHELL_ASSET_PATH = "/admin";

export function isAdminShellPath(pathname: string): boolean {
  return ADMIN_SHELL_PATHS.has(pathname);
}

export function toAdminShellAssetRequest(request: Request): Request {
  const url = new URL(request.url);
  url.pathname = ADMIN_SHELL_ASSET_PATH;
  url.search = "";

  return new Request(url.toString(), request);
}
