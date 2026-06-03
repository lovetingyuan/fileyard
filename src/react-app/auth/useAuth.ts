import {
  useAuthUser,
  useGoogleLoginMutation,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "../hooks/useAuthApi";
import { useAppStore } from "../store";
import { clearAuthError, setAuthError, setAuthMutating } from "./actions";
import { deriveAuthState } from "./state";

type AuthResult = Promise<{ success: boolean; error?: string; message?: string }>;

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAuth() {
  const { authError, authMutating } = useAppStore();
  const {
    user,
    error: sessionError,
    isLoading: isSessionLoading,
    mutate: mutateAuth,
  } = useAuthUser();
  const { login: triggerLogin, isMutating: isLoggingIn } = useLoginMutation();
  const { loginWithGoogle: triggerGoogleLogin, isMutating: isGoogleLoggingIn } =
    useGoogleLoginMutation();
  const { logout: triggerLogout, isMutating: isLoggingOut } = useLogoutMutation();
  const { register: triggerRegister, isMutating: isRegistering } = useRegisterMutation();
  const isMutationLoading = isLoggingIn || isGoogleLoggingIn || isRegistering || isLoggingOut;

  const runAuthAction = async <T>(
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

  const authState = deriveAuthState({
    authError,
    authMutating,
    isMutationLoading,
    sessionError,
    sessionLoading: isSessionLoading,
    user,
  });

  return {
    ...authState,
    login,
    loginWithGoogle,
    logout,
    register,
    checkAuth,
  };
}
