import { useState, type ReactNode } from "react";
import {
  useAuthUser,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
} from "../hooks/useAuthApi";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [localError, setLocalError] = useState<string | null>(null);
  const { user, error: authError, isLoading: isAuthLoading, mutate } = useAuthUser();
  const { login: triggerLogin, isMutating: isLoggingIn } = useLoginMutation();
  const { logout: triggerLogout, isMutating: isLoggingOut } = useLogoutMutation();
  const { register: triggerRegister, isMutating: isRegistering } = useRegisterMutation();

  const authLoading = isAuthLoading;
  const loading = authLoading || isLoggingIn || isRegistering || isLoggingOut;
  const error = authError?.message ?? localError;

  const checkAuth = async () => {
    setLocalError(null);
    await mutate();
  };

  const login = async (email: string, password: string) => {
    setLocalError(null);

    try {
      await triggerLogin(email, password);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setLocalError(message);
      return { success: false, error: message };
    }
  };

  const logout = async () => {
    try {
      setLocalError(null);
      await triggerLogout();
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
      value={{ user, authLoading, loading, error, login, logout, register, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}
