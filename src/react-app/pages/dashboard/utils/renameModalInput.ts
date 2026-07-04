import { cn } from "../../../utils/cn";

const RENAME_INPUT_BASE_CLASS_NAME = "input w-full";
const DEFAULT_RENAME_CONFIRM_TEXT = "保存";
const FILE_TYPE_CHANGE_CONFIRM_TEXT = "更改文件类型并保存";
const FILE_TYPE_CHANGE_CONFIRM_BUTTON_CLASS_NAME = "btn btn-sm btn-warning";

function getFileExtension(name: string): string {
  const value = name.trim();
  const extensionSeparatorIndex = value.lastIndexOf(".");

  if (extensionSeparatorIndex <= 0 || extensionSeparatorIndex === value.length - 1) {
    return "";
  }

  return value.slice(extensionSeparatorIndex + 1);
}

function isRenameFileExtensionChanged({
  currentName,
  name,
  type,
}: {
  currentName: string;
  name: string;
  type: "file" | "folder";
}): boolean {
  return (
    type === "file" &&
    name.trim().length > 0 &&
    getFileExtension(currentName) !== getFileExtension(name)
  );
}

export function getRenameInputInitialValue(currentName: string | null | undefined): string {
  return currentName ?? "";
}

export function shouldCloseRenameWithoutSaving({
  currentName,
  name,
}: {
  currentName: string;
  name: string;
}): boolean {
  return name.trim() === currentName;
}

export function getRenameValidationMessageForInput({
  currentName,
  name,
  rawValidationMessage,
}: {
  currentName: string;
  name: string;
  rawValidationMessage: string | null;
}): string | null {
  if (shouldCloseRenameWithoutSaving({ currentName, name })) {
    return null;
  }

  return rawValidationMessage;
}

export function getVisibleRenameValidationMessage(
  validationMessage: string | null,
  hasEditedName: boolean,
): string | null {
  if (!hasEditedName) {
    return null;
  }

  return validationMessage;
}

export function getRenameInputClassName({
  isUploadBlocked,
  visibleValidationMessage,
}: {
  isUploadBlocked: boolean;
  visibleValidationMessage: string | null;
}): string {
  return cn(
    RENAME_INPUT_BASE_CLASS_NAME,
    (visibleValidationMessage || isUploadBlocked) && "input-error",
  );
}

export function isRenameConfirmDisabled({
  currentName,
  isRenaming,
  isUploadBlocked,
  name,
  validationMessage,
}: {
  currentName: string;
  isRenaming: boolean;
  isUploadBlocked: boolean;
  name: string;
  validationMessage: string | null;
}): boolean {
  return (
    shouldCloseRenameWithoutSaving({ currentName, name }) ||
    Boolean(validationMessage) ||
    isUploadBlocked ||
    isRenaming
  );
}

export function getRenameConfirmText({
  currentName,
  name,
  type,
}: {
  currentName: string;
  name: string;
  type: "file" | "folder";
}): string {
  if (isRenameFileExtensionChanged({ currentName, name, type })) {
    return FILE_TYPE_CHANGE_CONFIRM_TEXT;
  }

  return DEFAULT_RENAME_CONFIRM_TEXT;
}

export function getRenameConfirmButtonClassName({
  currentName,
  name,
  type,
}: {
  currentName: string;
  name: string;
  type: "file" | "folder";
}): string | undefined {
  if (isRenameFileExtensionChanged({ currentName, name, type })) {
    return FILE_TYPE_CHANGE_CONFIRM_BUTTON_CLASS_NAME;
  }

  return undefined;
}

export function focusRenameInput(node: HTMLInputElement | null) {
  if (!node) {
    return;
  }

  node.focus();
  node.select();
}
