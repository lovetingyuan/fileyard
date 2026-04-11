import { useState } from "react";
import { authClient, type BetterAuthSession } from "../lib/auth-client";

export interface User {
  id: string;
  email: string;
  image: string | null;
  name: string;
  verified: boolean;
  createdAt?: string;
}

type RegisterResponse = {
  success: true;
  message: string;
};

type ForgotPasswordResponse = {
  success: true;
  message: string;
};

type ResetPasswordResponse = {
  success: true;
  message: string;
};

function mapUser(user: BetterAuthSession["user"] | null | undefined): User | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    image: user.image ?? null,
    name: user.name,
    verified: user.emailVerified,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : undefined,
  };
}

export function useAuthUser() {
  const session = authClient.useSession();

  return {
    user: mapUser(session.data?.user),
    error: session.error,
    isLoading: session.isPending,
    mutate: () => session.refetch(),
  };
}

function useAsyncMutation<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [isMutating, setIsMutating] = useState(false);

  const run = async (...args: TArgs) => {
    setIsMutating(true);
    try {
      return await action(...args);
    } finally {
      setIsMutating(false);
    }
  };

  return {
    run,
    isMutating,
  };
}

function getErrorMessage(
  error: { message?: string | undefined } | null | undefined,
  fallback: string,
) {
  return error?.message || fallback;
}

export function useLoginMutation() {
  const mutation = useAsyncMutation(async (email: string, password: string) => {
    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL: "/login?verified=1",
    });

    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Login failed"));
    }

    return result.data;
  });

  return {
    login: mutation.run,
    isMutating: mutation.isMutating,
  };
}

export function useGoogleLoginMutation() {
  const mutation = useAsyncMutation(async () => {
    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/",
    });

    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Google login failed"));
    }

    return result.data;
  });

  return {
    loginWithGoogle: mutation.run,
    isMutating: mutation.isMutating,
  };
}

export function useRegisterMutation() {
  const mutation = useAsyncMutation(async (email: string, password: string) => {
    const result = await authClient.signUp.email({
      email,
      password,
      name: "",
      callbackURL: "/login?verified=1",
    });

    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Registration failed"));
    }

    return {
      success: true,
      message: "Registration successful. Please check your email to verify your account.",
    } satisfies RegisterResponse;
  });

  return {
    register: mutation.run,
    isMutating: mutation.isMutating,
  };
}

export function useLogoutMutation() {
  const mutation = useAsyncMutation(async () => {
    const result = await authClient.signOut();

    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Logout failed"));
    }
  });

  return {
    logout: mutation.run,
    isMutating: mutation.isMutating,
  };
}

export function useForgotPasswordMutation() {
  const mutation = useAsyncMutation(async (email: string) => {
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Failed to send reset email"));
    }

    return {
      success: true,
      message: "If an account exists, a password reset email has been sent.",
    } satisfies ForgotPasswordResponse;
  });

  return {
    forgotPassword: mutation.run,
    isMutating: mutation.isMutating,
  };
}

export function useResetPasswordMutation() {
  const mutation = useAsyncMutation(async (token: string, password: string) => {
    const result = await authClient.resetPassword({
      token,
      newPassword: password,
    });

    if (result.error) {
      throw new Error(getErrorMessage(result.error, "Failed to reset password"));
    }

    return {
      success: true,
      message: "Password reset successful. Please log in with your new password.",
    } satisfies ResetPasswordResponse;
  });

  return {
    resetPassword: mutation.run,
    isMutating: mutation.isMutating,
  };
}
