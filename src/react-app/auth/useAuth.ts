import { useEffect } from "react";
import type { User } from "../../types";
import {
  useAuthUser,
  useGoogleLoginMutation,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "../hooks/useAuthApi";
import { useAppStore } from "../store";
import { clearAuthError, setAuthError, setAuthMutating, setAuthSessionState } from "./actions";

type AuthResult = Promise<{ success: boolean; error?: string; message?: string }>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAuth() {
  const { authError, authLoading, authMutating, userInfo } = useAppStore();
  const { user, error: sessionError, isLoading: isSessionLoading, mutate: mutateAuth } = useAuthUser();
  const { login: triggerLogin, isMutating: isLoggingIn } = useLoginMutation();
  const { loginWithGoogle: triggerGoogleLogin, isMutating: isGoogleLoggingIn } =
    useGoogleLoginMutation();
  const { logout: triggerLogout, isMutating: isLoggingOut } = useLogoutMutation();
  const { register: triggerRegister, isMutating: isRegistering } = useRegisterMutation();
  const isMutationLoading = isLoggingIn || isGoogleLoggingIn || isRegistering || isLoggingOut;

  useEffect(() => {
    setAuthSessionState({ user, isLoading: isSessionLoading, error: sessionError });
  }, [user, isSessionLoading, sessionError]);

  useEffect(() => {
    setAuthMutating(isMutationLoading);
  }, [isMutationLoading]);

  const runAuthAction = async <T,>(
    action: () => Promise<T>,
    fallback: string,
    onSuccess?: (data: T) => Promise<void> | void,
  ): AuthResult => {
    clearAuthError();
    setAuthMutating(true);

    try {
      const data = await action();
      await onSuccess?.(data);
      return { success: true, message: (data as { message?: string }).message };
    } catch (error) {
      const message = getErrorMessage(error, fallback);
      setAuthError(message);
      return { success: false, error: message };
    } finally {
      setAuthMutating(false);
    }
  };

  const checkAuth = async () => {
    clearAuthError();
    await mutateAuth();
  };

  const login = (email: string, password: string) =>
    runAuthAction(
      () => triggerLogin(email, password),
      "Login failed",
      async () => {
        await mutateAuth();
      },
    );

  const loginWithGoogle = () => runAuthAction(() => triggerGoogleLogin(), "Google login failed");

  const logout = async () => {
    clearAuthError();
    setAuthMutating(true);

    try {
      await triggerLogout();
      if (typeof window !== "undefined") {
        window.location.assign("/");
        return;
      }

      await mutateAuth();
    } catch (error) {
      setAuthError(getErrorMessage(error, "Logout failed"));
    } finally {
      setAuthMutating(false);
    }
  };

  const register = (email: string, password: string) =>
    runAuthAction(() => triggerRegister(email, password), "Registration failed");

  const currentUser: User | null = userInfo ?? user;
  const currentAuthLoading = authLoading || isSessionLoading;
  const loading = currentAuthLoading || authMutating || isMutationLoading;

  return {
    user: currentUser,
    authLoading: currentAuthLoading,
    loading,
    error: authError ?? sessionError?.message ?? null,
    login,
    loginWithGoogle,
    logout,
    register,
    checkAuth,
  };
}
