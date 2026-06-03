import type { User } from "../../types";

type SessionError = { message?: string | undefined } | Error | null | undefined;

export type DerivedAuthStateInput = {
  authError: string | null;
  authMutating: boolean;
  isMutationLoading: boolean;
  sessionError: SessionError;
  sessionLoading: boolean;
  user: User | null;
};

export type DerivedAuthState = {
  authLoading: boolean;
  error: string | null;
  loading: boolean;
  user: User | null;
};

export function deriveAuthState({
  authError,
  authMutating,
  isMutationLoading,
  sessionError,
  sessionLoading,
  user,
}: DerivedAuthStateInput): DerivedAuthState {
  return {
    user,
    authLoading: sessionLoading,
    loading: sessionLoading || authMutating || isMutationLoading,
    error: authError ?? sessionError?.message ?? null,
  };
}
