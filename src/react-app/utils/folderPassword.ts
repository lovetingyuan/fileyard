import { SHARE_PASSWORD_MIN_LENGTH } from "../../types";

export function normalizeFolderPassword(password: string): string {
  return password.trim();
}

export function getFolderPasswordLengthError(password: string): string | null {
  const normalizedPassword = normalizeFolderPassword(password);
  return normalizedPassword.length < SHARE_PASSWORD_MIN_LENGTH
    ? `密码至少需要 ${SHARE_PASSWORD_MIN_LENGTH} 位`
    : null;
}

export function getFolderPasswordConfirmError(
  password: string,
  confirmPassword: string,
): string | null {
  const lengthError = getFolderPasswordLengthError(password);
  if (lengthError) {
    return lengthError;
  }

  if (normalizeFolderPassword(password) !== normalizeFolderPassword(confirmPassword)) {
    return "两次输入的密码不一致";
  }

  return null;
}
