import { useState, type ReactNode } from "react";
import {
  useGoogleLoginMutation,
  useAuthUser,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "../hooks/useAuthApi";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [localError, setLocalError] = useState<string | null>(null);
  const { user, error: authError, isLoading: isAuthLoading, mutate: mutateAuth } = useAuthUser();
  const { login: triggerLogin, isMutating: isLoggingIn } = useLoginMutation();
  const { loginWithGoogle: triggerGoogleLogin, isMutating: isGoogleLoggingIn } =
    useGoogleLoginMutation();
  const { logout: triggerLogout, isMutating: isLoggingOut } = useLogoutMutation();
  const { register: triggerRegister, isMutating: isRegistering } = useRegisterMutation();

  const authLoading = isAuthLoading;
  const loading = authLoading || isLoggingIn || isGoogleLoggingIn || isRegistering || isLoggingOut;
  const error = authError?.message ?? localError;

  const checkAuth = async () => {
    setLocalError(null);
    await mutateAuth();
  };

  const login = async (email: string, password: string) => {
    setLocalError(null);

    try {
      await triggerLogin(email, password);
      await mutateAuth();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setLocalError(message);
      return { success: false, error: message };
    }
  };

  const loginWithGoogle = async () => {
    setLocalError(null);

    try {
      await triggerGoogleLogin();
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Google login failed";
      setLocalError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      setLocalError(null);
      await triggerLogout();
      if (typeof window !== "undefined") {
        window.location.assign("/");
        return;
      }

      await mutateAuth();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setLocalError(message);
    }
  };

  const register = async (email: string, password: string) => {
    setLocalError(null);

    try {
      const data = await triggerRegister(email, password);
      return { success: true, message: data.message };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed";
      setLocalError(message);
      return { success: false, error: message };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authLoading,
        loading,
        error,
        login,
        loginWithGoogle,
        logout,
        register,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
