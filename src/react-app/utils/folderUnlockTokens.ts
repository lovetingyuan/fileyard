import { getStoreState } from "../store";

export const FOLDER_UNLOCK_HEADER = "X-Fileyard-Folder-Unlock";
export const FOLDER_UNLOCK_QUERY_PARAM = "folderUnlockToken";

function isPathWithinFolder(path: string, folderPath: string): boolean {
  return path === folderPath || path.startsWith(`${folderPath}/`);
}

export function getFolderUnlockTokenFromTokens(
  tokens: Record<string, string>,
  path: string,
): string | null {
  let bestMatch: { path: string; token: string } | null = null;

  for (const [protectedPath, token] of Object.entries(tokens)) {
    if (!isPathWithinFolder(path, protectedPath)) {
      continue;
    }

    if (!bestMatch || protectedPath.length > bestMatch.path.length) {
      bestMatch = { path: protectedPath, token };
    }
  }

  return bestMatch?.token ?? null;
}

export function getFolderUnlockTokenForPath(path: string): string | null {
  return getFolderUnlockTokenFromTokens(getStoreState().folderUnlockTokens, path);
}

export function getFolderUnlockHeadersForPath(path: string): Record<string, string> | undefined {
  const token = getFolderUnlockTokenForPath(path);
  return token ? { [FOLDER_UNLOCK_HEADER]: token } : undefined;
}

export function appendFolderUnlockToken(url: string, path: string): string {
  const token = getFolderUnlockTokenForPath(path);
  if (!token) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${FOLDER_UNLOCK_QUERY_PARAM}=${encodeURIComponent(token)}`;
}
