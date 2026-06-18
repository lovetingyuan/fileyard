import { getStoreState } from "../store";

export const FOLDER_UNLOCK_HEADER = "X-Fileyard-Folder-Unlock";
export const FOLDER_UNLOCKS_HEADER = "X-Fileyard-Folder-Unlocks";
export const FOLDER_UNLOCK_QUERY_PARAM = "folderUnlockToken";

function isPathWithinFolder(path: string, folderPath: string): boolean {
  return path === folderPath || path.startsWith(`${folderPath}/`);
}

function getFolderUnlockTokenMatchFromTokens(
  tokens: Record<string, string>,
  path: string,
): { path: string; token: string } | null {
  let bestMatch: { path: string; token: string } | null = null;

  for (const [protectedPath, token] of Object.entries(tokens)) {
    if (!isPathWithinFolder(path, protectedPath)) {
      continue;
    }

    if (!bestMatch || protectedPath.length > bestMatch.path.length) {
      bestMatch = { path: protectedPath, token };
    }
  }

  return bestMatch;
}

function isRelatedUnlockPath(path: string, protectedPath: string): boolean {
  return isPathWithinFolder(path, protectedPath) || isPathWithinFolder(protectedPath, path);
}

function encodeFolderUnlocksHeader(tokens: Record<string, string>): string {
  return encodeURIComponent(JSON.stringify(tokens));
}

export function getFolderUnlockTokenFromTokens(
  tokens: Record<string, string>,
  path: string,
): string | null {
  return getFolderUnlockTokenMatchFromTokens(tokens, path)?.token ?? null;
}

export function getFolderUnlockTokenForPath(path: string): string | null {
  return getFolderUnlockTokenFromTokens(getStoreState().folderUnlockTokens, path);
}

export function getFolderUnlockHeadersForPath(path: string): Record<string, string> | undefined {
  const token = getFolderUnlockTokenForPath(path);
  return token ? { [FOLDER_UNLOCK_HEADER]: token } : undefined;
}

export function getFolderUnlockHeadersForPaths(paths: string[]): Record<string, string> | undefined {
  const tokens = getStoreState().folderUnlockTokens;
  const unlocks: Record<string, string> = {};

  for (const [protectedPath, token] of Object.entries(tokens)) {
    if (paths.some((path) => isRelatedUnlockPath(path, protectedPath))) {
      unlocks[protectedPath] = token;
    }
  }

  return Object.keys(unlocks).length > 0
    ? { [FOLDER_UNLOCKS_HEADER]: encodeFolderUnlocksHeader(unlocks) }
    : undefined;
}

export function getAllFolderUnlockHeaders(): Record<string, string> | undefined {
  const tokens = getStoreState().folderUnlockTokens;
  return Object.keys(tokens).length > 0
    ? { [FOLDER_UNLOCKS_HEADER]: encodeFolderUnlocksHeader(tokens) }
    : undefined;
}

export function appendFolderUnlockToken(url: string, path: string): string {
  const token = getFolderUnlockTokenForPath(path);
  if (!token) {
    return url;
  }

  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}${FOLDER_UNLOCK_QUERY_PARAM}=${encodeURIComponent(token)}`;
}
