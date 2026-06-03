import { getStoreMethods } from "../store";

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
