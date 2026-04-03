const dateFormatterWithYear = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const dateFormatterWithoutYear = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function formatDate(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  const currentYear = new Date().getFullYear();
  return date.getFullYear() === currentYear
    ? dateFormatterWithoutYear.format(date)
    : dateFormatterWithYear.format(date);
}

const sizeFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = -1;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${sizeFormatter.format(value)} ${units[unitIndex]}`;
}

export function getDownloadFilename(
  contentDisposition: string | null,
  fallbackName: string,
): string {
  if (!contentDisposition) {
    return fallbackName;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return fallbackName;
    }
  }

  const plainMatch = contentDisposition.match(/filename="([^"]+)"/i);
  return plainMatch?.[1] ?? fallbackName;
}
