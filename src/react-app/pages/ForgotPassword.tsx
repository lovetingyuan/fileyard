import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { useForgotPasswordMutation } from "../hooks/useAuthApi";

export function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const emailId = useId();
  const [email, setEmail] = useState(() => searchParams.get("email") ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [nextAction, setNextAction] = useState<"verify-email" | null>(null);
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
      setNextAction(result.nextAction ?? null);
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
            <div className="form-control">
              <label className="label" htmlFor={emailId}>
                <span className="label-text flex items-center gap-1">
                  <Icon icon="mdi:email-outline" className="h-4 w-4" />
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
                <Icon icon={nextAction ? "mdi:email-check-outline" : "mdi:information-outline"} />
                <span>{message}</span>
              </div>
            )}

            <div className="form-control mt-6">
              <button
                type="submit"
                className={`btn btn-primary gap-2 ${isMutating ? "loading" : ""}`}
                disabled={isMutating}
              >
                {!isMutating && <Icon icon="mdi:lock-reset" className="h-5 w-5" />}
                {isMutating ? "Sending reset link..." : "Reset password"}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <Link
            to={`/login${email ? `?email=${encodeURIComponent(email)}` : ""}`}
            className="btn btn-outline gap-2"
          >
            <Icon icon="mdi:login" className="h-5 w-5" />
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}
