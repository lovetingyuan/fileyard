import type { FileEntry, FolderEntry } from "../../types";

const RESERVED_NAMES = new Set([".fileyard-folder", ".fileshare-folder", ".user"]);

function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function getLabel(type: "file" | "folder"): string {
  return type === "file" ? "File name" : "Folder name";
}

export function getRenameValidationMessage({
  currentName,
  files,
  folders,
  name,
  type,
}: {
  currentName: string;
  files: FileEntry[];
  folders: FolderEntry[];
  name: string;
  type: "file" | "folder";
}): string | null {
  const value = name.trim();
  const label = getLabel(type);

  if (!value) {
    return `${label} cannot be empty`;
  }
  if (value === currentName) {
    return `New ${type} name must be different`;
  }
  if (RESERVED_NAMES.has(value)) {
    return "This is a reserved name";
  }
  if (value.includes("/")) {
    return `${label} cannot contain "/"`;
  }
  if (value.includes("\\")) {
    return `${label} cannot contain "\\"`;
  }
  if (value === "." || value === "..") {
    return `${label} cannot be "." or ".."`;
  }
  if (containsControlCharacters(value)) {
    return `${label} contains invalid characters`;
  }
  if (folders.some((folder) => folder.name === value)) {
    return "A folder with this name already exists";
  }
  if (files.some((file) => file.name === value)) {
    return "A file with this name already exists";
  }

  return null;
}
