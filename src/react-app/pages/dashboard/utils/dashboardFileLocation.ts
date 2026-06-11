export const DASHBOARD_FILE_LOCATION_SCROLL_DELAY_MS = 220;
export const DASHBOARD_FILE_LOCATION_HIGHLIGHT_MS = 3200;

export function getDashboardFileParentPath(filePath: string): string {
  const separatorIndex = filePath.lastIndexOf("/");

  if (separatorIndex <= 0) {
    return "";
  }

  return filePath.slice(0, separatorIndex);
}

export function scrollDashboardLocatedFileIntoView(element: HTMLElement | null) {
  element?.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest",
  });
}
