export function getDashboardTreeAutoOpenPaths(currentPath: string): string[] {
  if (!currentPath) {
    return [];
  }

  const segments = currentPath.split("/").filter(Boolean);
  return segments.map((_, index) => segments.slice(0, index + 1).join("/"));
}

export function mergeDashboardTreeOpenPaths(
  openPaths: string[],
  autoOpenPaths: string[],
): string[] {
  const nextPaths = [...openPaths];
  const seenPaths = new Set(nextPaths);

  for (const path of autoOpenPaths) {
    if (!seenPaths.has(path)) {
      nextPaths.push(path);
      seenPaths.add(path);
    }
  }

  return nextPaths;
}

export function toggleDashboardTreeOpenPath(openPaths: string[], path: string): string[] {
  return openPaths.includes(path)
    ? openPaths.filter((openPath) => openPath !== path)
    : [...openPaths, path];
}
