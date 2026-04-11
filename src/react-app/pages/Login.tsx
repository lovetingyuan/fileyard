import { useId, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

interface LoginProps {
  onSwitchToRegister: () => void;
}

export function Login({ onSwitchToRegister }: LoginProps) {
  const [searchParams] = useSearchParams();
  const { login, loginWithGoogle, loading } = useAuth();
  const emailId = useId();
  const passwordId = useId();
  const registered = searchParams.get("registered") === "1";
  const reset = searchParams.get("reset") === "1";
  const verified = searchParams.get("verified") === "1";
  const initialEmail = searchParams.get("email") ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const toastShownRef = useRef({ registered: false, reset: false, verified: false });

  if (registered && !toastShownRef.current.registered) {
    toastShownRef.current.registered = true;
    // Schedule toast after render to avoid calling during render phase
    Promise.resolve().then(() =>
      toast.success("Registration successful. Please check your email to verify your account."),
    );
  }

  if (reset && !toastShownRef.current.reset) {
    toastShownRef.current.reset = true;
    Promise.resolve().then(() =>
      toast.success("Password reset successful. Please log in with your new password."),
    );
  }

  if (verified && !toastShownRef.current.verified) {
    toastShownRef.current.verified = true;
    Promise.resolve().then(() => toast.success("Email verified. You can now log in."));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    const result = await login(email, password);
    if (!result.success) {
      setFormError(result.error || "Login failed");
      toast.error(result.error || "Login failed");
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    const result = await loginWithGoogle();
    if (!result.success) {
      setFormError(result.error || "Google login failed");
      toast.error(result.error || "Google login failed");
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-4">Login</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="alert alert-error">
                <Icon icon="mdi:alert-circle-outline" className="h-5 w-5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="form-control">
              <label className="label" htmlFor={emailId}>
                <span className="label-text flex items-center gap-1">
                  <Icon icon="mdi:email-outline" className="w-4 h-4" />
                  Email
                </span>
              </label>
              <input
                id={emailId}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="email@example.com"
                className="input input-bordered w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                spellCheck={false}
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor={passwordId}>
                <span className="label-text flex items-center gap-1">
                  <Icon icon="mdi:lock-outline" className="w-4 h-4" />
                  Password
                </span>
              </label>
              <input
                id={passwordId}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <div className="form-control mt-6 flex justify-between items-center">
              <button
                type="submit"
                className={`btn btn-primary gap-2 ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                {loading ? (
                  "Logging in..."
                ) : (
                  <>
                    <Icon icon="mdi:login" className="w-5 h-5" />
                    Login
                  </>
                )}
              </button>
              <Link
                to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                className="link link-hover text-sm text-primary"
              >
                Forgot password?
              </Link>
            </div>
          </form>

          <div className="divider">OR</div>

          <button
            type="button"
            className="btn btn-outline gap-2"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <Icon icon="mdi:google" className="w-5 h-5" />
            Continue with Google
          </button>

          <div className="divider">OR</div>

          <button
            type="button"
            className="btn btn-outline gap-2"
            onClick={onSwitchToRegister}
            disabled={loading}
          >
            <Icon icon="mdi:account-plus-outline" className="w-5 h-5" />
            Create an account
          </button>
        </div>
      </div>
    </main>
  );
}
