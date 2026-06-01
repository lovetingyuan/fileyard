import type { ClipboardUploadItem } from "../../types";

export type ClipboardItemLike = {
  types: readonly string[];
  getType: (type: string) => Promise<Blob>;
};

type ClipboardDataFileItemLike = {
  kind?: string;
  type?: string;
  getAsFile?: () => File | null;
};

type ClipboardDataLike = {
  files?: ArrayLike<File> | null;
  items?: ArrayLike<ClipboardDataFileItemLike> | null;
};

type ClipboardUploadItemOptions = {
  createId?: () => string;
  now?: () => Date;
};

const TEXT_CLIPBOARD_TYPES = new Set(["text/plain", "text/html", "text/uri-list"]);
const MIME_EXTENSION_MAP: Record<string, string> = {
  "application/json": "json",
  "application/pdf": "pdf",
  "application/zip": "zip",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/webp": "webp",
};

function createDefaultId(): string {
  return crypto.randomUUID();
}

function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatClipboardTimestamp(date: Date): string {
  return [
    date.getUTCFullYear(),
    padDatePart(date.getUTCMonth() + 1),
    padDatePart(date.getUTCDate()),
    "-",
    padDatePart(date.getUTCHours()),
    padDatePart(date.getUTCMinutes()),
    padDatePart(date.getUTCSeconds()),
  ].join("");
}

function getExtensionForMimeType(type: string): string {
  if (MIME_EXTENSION_MAP[type]) {
    return MIME_EXTENSION_MAP[type];
  }

  const subtype = type.split("/")[1]?.split("+")[0]?.trim();
  if (subtype && /^[a-z0-9]+$/i.test(subtype)) {
    return subtype.toLowerCase();
  }

  return "bin";
}

function getGeneratedClipboardFilename(file: File, index: number, now: Date): string {
  const suffix = index === 0 ? "" : `-${index + 1}`;
  const extension = getExtensionForMimeType(file.type);
  return `clipboard-${formatClipboardTimestamp(now)}${suffix}.${extension}`;
}

function renameFile(file: File, name: string, now: Date): File {
  return new File([file], name, {
    lastModified: file.lastModified || now.getTime(),
    type: file.type,
  });
}

function isAsyncClipboardUploadType(type: string): boolean {
  if (!type || TEXT_CLIPBOARD_TYPES.has(type)) {
    return false;
  }
  return !type.startsWith("text/");
}

function fileFromClipboardBlob(blob: Blob, type: string, now: Date): File {
  if (blob instanceof File) {
    return blob.name ? blob : renameFile(blob, "", now);
  }

  return new File([blob], "", {
    lastModified: now.getTime(),
    type: blob.type || type,
  });
}

export function extractClipboardFilesFromData(clipboardData: ClipboardDataLike | null): File[] {
  if (!clipboardData) {
    return [];
  }

  const files = Array.from(clipboardData.files ?? []);
  if (files.length > 0) {
    return files;
  }

  return Array.from(clipboardData.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.getAsFile?.() ?? null)
    .filter((file): file is File => Boolean(file));
}

export function createClipboardUploadItemsFromFiles(
  files: File[],
  options: ClipboardUploadItemOptions = {},
): ClipboardUploadItem[] {
  const now = options.now?.() ?? new Date();
  const createId = options.createId ?? createDefaultId;

  return files.map((file, index) => {
    const namedFile = file.name ? file : renameFile(file, getGeneratedClipboardFilename(file, index, now), now);
    return {
      id: createId(),
      file: namedFile,
      name: namedFile.name,
      size: namedFile.size,
      contentType: namedFile.type,
    };
  });
}

export async function readClipboardUploadItems(
  clipboardItems: ClipboardItemLike[],
  options: ClipboardUploadItemOptions = {},
): Promise<ClipboardUploadItem[]> {
  const now = options.now?.() ?? new Date();
  const files: File[] = [];

  for (const item of clipboardItems) {
    const type = item.types.find(isAsyncClipboardUploadType);
    if (!type) {
      continue;
    }

    const blob = await item.getType(type);
    files.push(fileFromClipboardBlob(blob, type, now));
  }

  return createClipboardUploadItemsFromFiles(files, { ...options, now: () => now });
}
