import { useId, useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { getPasswordErrors, PASSWORD_REQUIREMENTS_HINT } from "../utils/passwordRules";

interface RegisterProps {
  onSwitchToLogin: (email?: string) => void;
}

export function Register({ onSwitchToLogin }: RegisterProps) {
  const { register, loading } = useAuth();
  const emailId = useId();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordErrors = getPasswordErrors(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (passwordErrors.length > 0) {
      toast.error("Password does not meet requirements");
      return;
    }

    const result = await register(email, password);
    if (result.success) {
      onSwitchToLogin(email.trim().toLowerCase());
    } else {
      toast.error(result.error || "Registration failed");
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-2xl font-bold text-center justify-center mb-4">
            Create Account
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                autoComplete="new-password"
                placeholder="••••••••"
                className="input input-bordered w-full"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                minLength={12}
                maxLength={64}
              />
              {passwordErrors.length > 0 && (
                <div className="label">
                  <ul className="text-error text-sm list-disc list-inside">
                    {passwordErrors.map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="label">
                <span className="label-text-alt text-xs text-base-content/80">
                  {PASSWORD_REQUIREMENTS_HINT}
                </span>
              </div>
            </div>

            <div className="form-control">
              <label className="label" htmlFor={confirmPasswordId}>
                <span className="label-text flex items-center gap-1">
                  <Icon icon="mdi:lock-check-outline" className="w-4 h-4" />
                  Confirm Password
                </span>
              </label>
              <input
                id={confirmPasswordId}
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                placeholder="••••••••"
                className="input input-bordered w-full"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
              {confirmPassword && password !== confirmPassword && (
                <div className="label">
                  <span className="label-text-alt text-error">Passwords do not match</span>
                </div>
              )}
            </div>

            <div className="form-control mt-6">
              <button
                type="submit"
                className={`btn btn-primary gap-2 ${loading ? "loading" : ""}`}
                disabled={loading}
              >
                <Icon icon="mdi:account-plus" className="w-5 h-5" />
                {loading ? "Creating account..." : "Register"}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <button
            type="button"
            className="btn btn-outline gap-2"
            onClick={() => onSwitchToLogin()}
            disabled={loading}
          >
            <Icon icon="mdi:login" className="w-5 h-5" />
            Already have an account? Login
          </button>
        </div>
      </div>
    </main>
  );
}
