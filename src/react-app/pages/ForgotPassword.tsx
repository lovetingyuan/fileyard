import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MdiEmailOutline from "~icons/mdi/email-outline";
import MdiInformationOutline from "~icons/mdi/information-outline";
import MdiLockReset from "~icons/mdi/lock-reset";
import MdiLogin from "~icons/mdi/login";
import toast from "react-hot-toast";
import { useForgotPasswordMutation } from "../hooks/useAuthApi";

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const emailId = useId();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const { forgotPassword, isMutating } = useForgotPasswordMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    try {
      const result = await forgotPassword(email);
      setMessage(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send reset email");
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-2 justify-center text-center text-2xl font-bold">
            Reset password
          </h2>
          <p className="text-center text-sm text-base-content/75">
            Enter your account email and we&apos;ll send you a password reset link.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-sm" htmlFor={emailId}>
                <span className="flex items-center gap-1">
                  <MdiEmailOutline className="h-4 w-4" />
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
                disabled={isMutating}
                required
                spellCheck={false}
              />
            </div>

            {message && (
              <div className="alert alert-info">
                <MdiInformationOutline />
                <span>{message}</span>
              </div>
            )}

            <div className="mt-6 flex">
              <button type="submit" className="btn btn-primary gap-2" disabled={isMutating}>
                {isMutating ? (
                  <span className="loading loading-spinner" aria-hidden="true" />
                ) : (
                  <MdiLockReset className="h-5 w-5" />
                )}
                {isMutating ? "Sending reset link..." : "Reset password"}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <Link
            to={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="btn btn-outline gap-2"
          >
            <MdiLogin className="h-5 w-5" />
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
