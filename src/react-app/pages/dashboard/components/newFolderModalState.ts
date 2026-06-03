interface NewFolderFieldErrorMessageOptions {
  createErrorMessage: string | null;
  trimmedName: string;
  validationMessage: string | null;
}

type FolderNameInputFocusTarget = Pick<HTMLInputElement, "focus" | "select">;

export function getNewFolderFieldErrorMessage({
  createErrorMessage,
  trimmedName,
  validationMessage,
}: NewFolderFieldErrorMessageOptions): string | null {
  if (!trimmedName) {
    return null;
  }

  return validationMessage ?? createErrorMessage;
}

export function focusFolderNameInput(input: FolderNameInputFocusTarget | null) {
  input?.focus();
  input?.select();
}
