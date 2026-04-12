const RESERVED_FOLDER_NAMES = new Set([".fileyard-folder", ".fileshare-folder"]);

function containsControlCharacters(value: string): boolean {
  for (const char of value) {
    const code = char.charCodeAt(0);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

export function validateFolderName(name: string): string | null {
  if (!name) {
    return "Folder name cannot be empty";
  }
  if (RESERVED_FOLDER_NAMES.has(name)) {
    return "This is a reserved name";
  }
  if (name.startsWith(".")) {
    return 'Folder name cannot start with "."';
  }
  if (name.includes("/")) {
    return 'Folder name cannot contain "/"';
  }
  if (name.includes("\\")) {
    return 'Folder name cannot contain "\\"';
  }
  if (name === "." || name === "..") {
    return 'Folder name cannot be "." or ".."';
  }
  if (containsControlCharacters(name)) {
    return "Folder name contains invalid characters";
  }
  return null;
}
