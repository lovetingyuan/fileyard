import { useId, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useResetPasswordMutation, useResetPasswordTokenValidation } from "../hooks/useAuthApi";
import { getPasswordErrors, PASSWORD_REQUIREMENTS_HINT } from "../utils/passwordRules";

export function ResetPassword() {
  const navigate = useNavigate();
  const { token } = useParams<{ token: string }>();
  const passwordId = useId();
  const confirmPasswordId = useId();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordErrors = getPasswordErrors(password);
  const {
    isValid: isValidToken,
    error: validationError,
    isLoading: isValidatingToken,
  } = useResetPasswordTokenValidation(token);
  const { resetPassword, isMutating } = useResetPasswordMutation();

  const invalidMessage = validationError instanceof Error ? validationError.message : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !isValidToken) {
      toast.error("Invalid reset link");
      return;
    }

    if (!password || !confirmPassword) {
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

    try {
      await resetPassword(token, password);
      navigate("/login?reset=1");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset password");
    }
  };

  if (!token || (!isValidatingToken && !isValidToken)) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body text-center">
            <Icon icon="mdi:close-circle" className="mx-auto mb-4 text-6xl text-error" width={72} />
            <h2 className="card-title justify-center text-2xl font-bold">Invalid reset link</h2>
            <p className="mt-2 text-error">
              {invalidMessage ?? "Please request a new password reset email."}
            </p>
            <Link to="/forgot-password" className="btn btn-primary mt-4 gap-2">
              <Icon icon="mdi:lock-reset" className="h-5 w-5" />
              Request a new link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isValidatingToken) {
    return (
      <main className="flex flex-1 items-center justify-center p-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <span className="loading loading-spinner loading-lg text-primary"></span>
            <h2 className="card-title justify-center text-2xl font-bold">Checking reset link</h2>
            <p className="text-sm text-base-content/75">
              Verifying that your password reset link is still valid.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-2 justify-center text-center text-2xl font-bold">
            Reset password
          </h2>
          <p className="text-center text-sm text-base-content/75">
            Choose a new password for your account.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="form-control">
              <label className="label" htmlFor={passwordId}>
                <span className="label-text flex items-center gap-1">
                  <Icon icon="mdi:lock-outline" className="h-4 w-4" />
                  New Password
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
                disabled={isMutating}
                required
                minLength={8}
                maxLength={64}
              />
              {passwordErrors.length > 0 && (
                <div className="label">
                  <ul className="list-inside list-disc text-sm text-error">
                    {passwordErrors.map((error) => (
                      <li key={error}>{error}</li>
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
                  <Icon icon="mdi:lock-check-outline" className="h-4 w-4" />
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
                disabled={isMutating}
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
                className={`btn btn-primary gap-2 ${isMutating ? "loading" : ""}`}
                disabled={isMutating}
              >
                {!isMutating && <Icon icon="mdi:lock-reset" className="h-5 w-5" />}
                {isMutating ? "Resetting password..." : "Reset password"}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <Link to="/login" className="btn btn-outline gap-2">
            <Icon icon="mdi:login" className="h-5 w-5" />
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
