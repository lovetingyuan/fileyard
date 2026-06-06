import { SHARE_PASSWORD_MAX_LENGTH, SHARE_PASSWORD_MIN_LENGTH } from "../../types";

export function normalizeSharePassword(password: string): string {
  return password.trim();
}

export function getSharePasswordError(password: string): string | null {
  const normalizedPassword = normalizeSharePassword(password);
  if (!normalizedPassword) {
    return null;
  }

  if (normalizedPassword.length < SHARE_PASSWORD_MIN_LENGTH) {
    return `密码至少需要 ${SHARE_PASSWORD_MIN_LENGTH} 位`;
  }

  if (normalizedPassword.length > SHARE_PASSWORD_MAX_LENGTH) {
    return `密码最多 ${SHARE_PASSWORD_MAX_LENGTH} 位`;
  }

  return null;
}
