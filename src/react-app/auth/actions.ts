import type { User } from "../../types";
import { getStoreMethods } from "../store";

type AuthSessionState = {
  user: User | null;
  isLoading: boolean;
  error: { message?: string | undefined } | Error | null | undefined;
};

function toAuthError(error: AuthSessionState["error"]): string | null {
  return error?.message ?? null;
}

function isSameUser(left: User | null, right: User | null): boolean {
  if (left === right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  return (
    left.id === right.id &&
    left.email === right.email &&
    left.image === right.image &&
    left.name === right.name &&
    left.verified === right.verified &&
    (left.createdAt ?? null) === (right.createdAt ?? null)
  );
}

export function setAuthSessionState({ user, isLoading, error }: AuthSessionState) {
  const { setAuthError, setAuthLoading, setUserInfo } = getStoreMethods();

  setUserInfo((currentUser) => (isSameUser(currentUser, user) ? currentUser : user));
  setAuthLoading(isLoading);
  setAuthError(toAuthError(error));
}

export function setAuthMutating(isMutating: boolean) {
  const { setAuthMutating } = getStoreMethods();

  setAuthMutating(isMutating);
}

export function setAuthError(message: string | null) {
  const { setAuthError } = getStoreMethods();

  setAuthError(message);
}

export function clearAuthError() {
  setAuthError(null);
}
