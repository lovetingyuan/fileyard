import { SHARE_PASSWORD_MIN_LENGTH } from "../../types";

export function normalizeFolderPassword(password: string): string {
  return password.trim();
}

export function getFolderPasswordConfirmError(password: string, confirmPassword: string): string | null {
  const normalizedPassword = normalizeFolderPassword(password);
  if (normalizedPassword.length < SHARE_PASSWORD_MIN_LENGTH) {
    return `密码至少需要 ${SHARE_PASSWORD_MIN_LENGTH} 位`;
  }

  if (normalizedPassword !== normalizeFolderPassword(confirmPassword)) {
    return "两次输入的密码不一致";
  }

  return null;
}
