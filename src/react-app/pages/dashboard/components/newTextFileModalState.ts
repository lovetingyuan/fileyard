const DEFAULT_NEW_TEXT_FILE_CONFIRM_TEXT = "保存";
const MISSING_EXTENSION_CONFIRM_TEXT = "缺少后缀，继续保存";
const MISSING_EXTENSION_CONFIRM_BUTTON_CLASS_NAME = "btn btn-sm btn-warning";

function isMissingFileExtension(name: string): boolean {
  const value = name.trim();
  const extensionSeparatorIndex = value.lastIndexOf(".");

  return (
    value.length > 0 &&
    (extensionSeparatorIndex <= 0 || extensionSeparatorIndex === value.length - 1)
  );
}

export function getNewTextFileConfirmText(name: string): string {
  if (isMissingFileExtension(name)) {
    return MISSING_EXTENSION_CONFIRM_TEXT;
  }

  return DEFAULT_NEW_TEXT_FILE_CONFIRM_TEXT;
}

export function getNewTextFileConfirmButtonClassName(name: string): string | undefined {
  if (isMissingFileExtension(name)) {
    return MISSING_EXTENSION_CONFIRM_BUTTON_CLASS_NAME;
  }

  return undefined;
}
