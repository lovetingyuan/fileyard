import { useId, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import MdiAccountPlusOutline from "~icons/mdi/account-plus-outline";
import MdiAlertCircleOutline from "~icons/mdi/alert-circle-outline";
import MdiEmailOutline from "~icons/mdi/email-outline";
import MdiLockOutline from "~icons/mdi/lock-outline";
import MdiLogin from "~icons/mdi/login";
import { authClient } from "../authClient";
import { sanitizeAdminRedirectTarget } from "../utils/adminRoutes";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" focusable="false" className={className}>
      <path
        fill="#FBBC05"
        d="M43.61 20.08H42V20H24v8h11.3A12 12 0 0 1 24 36c-6.63 0-12-5.37-12-12s5.37-12 12-12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66A19.9 19.9 0 0 0 24 4C12.95 4 4 12.95 4 24s8.95 20 20 20c10.05 0 19-7 19-20 0-1.34-.14-2.65-.39-3.92Z"
      />
      <path
        fill="#EA4335"
        d="m6.31 14.69 6.57 4.82A12 12 0 0 1 24 12c3.06 0 5.84 1.15 7.96 3.04l5.66-5.66A19.9 19.9 0 0 0 24 4 19.97 19.97 0 0 0 6.31 14.69Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.17 0 9.86-1.98 13.41-5.19l-6.19-5.24A11.94 11.94 0 0 1 24 36a12 12 0 0 1-11.28-7.95l-6.52 5.03A19.98 19.98 0 0 0 24 44Z"
      />
      <path
        fill="#4285F4"
        d="M43.61 20.08H42V20H24v8h11.3a12.03 12.03 0 0 1-4.08 5.57l6.19 5.24C40.97 35.51 44 30.26 44 24c0-1.34-.14-2.65-.39-3.92Z"
      />
    </svg>
  );
}

function getErrorMessage(
  error: { message?: string | undefined } | null | undefined,
  fallback: string,
) {
  return error?.message || fallback;
}

export function AdminLogin() {
  const emailId = useId();
  const passwordId = useId();
  const [searchParams] = useSearchParams();
  const session = authClient.useSession();
  const redirectTo = sanitizeAdminRedirectTarget(searchParams.get("redirectTo"));
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isEmailLoginPending, setIsEmailLoginPending] = useState(false);
  const [isGoogleLoginPending, setIsGoogleLoginPending] = useState(false);
  const isPending = session.isPending || isEmailLoginPending || isGoogleLoginPending;

  if (session.data?.user) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (!email || !password) {
      toast.error("请填写邮箱和密码");
      return;
    }

    setIsEmailLoginPending(true);
    try {
      const result = await authClient.signIn.email({
        email,
        password,
        callbackURL: redirectTo,
      });

      if (result.error) {
        throw new Error(getErrorMessage(result.error, "登录失败"));
      }

      window.location.assign(redirectTo);
    } catch (error) {
      const message = error instanceof Error ? error.message : "登录失败";
      setFormError(message);
      toast.error(message);
      setIsEmailLoginPending(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoginPending) {
      return;
    }

    setFormError(null);
    setIsGoogleLoginPending(true);

    const result = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });

    if (result.error) {
      const message = getErrorMessage(result.error, "Google 登录失败");
      setFormError(message);
      toast.error(message);
      setIsGoogleLoginPending(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-base-200 p-4">
      <section className="card w-full max-w-md border border-base-300 bg-base-100 shadow-xl shadow-base-content/5">
        <div className="card-body">
          <p className="text-center text-sm font-semibold uppercase tracking-[0.28em] text-primary/70">
            Admin
          </p>
          <h1 className="card-title justify-center text-2xl font-bold">后台登录</h1>
          <p className="text-center text-sm leading-6 text-base-content/70">
            使用 Fileyard 同一账号系统登录后台。
          </p>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {formError ? (
              <div role="alert" className="alert alert-error">
                <MdiAlertCircleOutline className="h-5 w-5 shrink-0" />
                <span>{formError}</span>
              </div>
            ) : null}

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-sm" htmlFor={emailId}>
                <MdiEmailOutline className="h-4 w-4" />
                邮箱
              </label>
              <input
                id={emailId}
                type="email"
                name="email"
                autoComplete="email"
                placeholder="email@example.com"
                className="input w-full"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={isPending}
                required
                spellCheck={false}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-1 text-sm" htmlFor={passwordId}>
                <MdiLockOutline className="h-4 w-4" />
                密码
              </label>
              <input
                id={passwordId}
                type="password"
                name="password"
                autoComplete="current-password"
                placeholder="请输入密码"
                className="input w-full"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <button type="submit" className="btn btn-primary gap-2" disabled={isPending}>
                {isEmailLoginPending ? (
                  <span className="loading loading-spinner" aria-hidden="true" />
                ) : (
                  <MdiLogin className="h-5 w-5" />
                )}
                {isEmailLoginPending ? "登录中..." : "登录"}
              </button>
              <a
                href={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`}
                className="link link-hover text-sm text-primary"
              >
                忘记密码？
              </a>
            </div>
          </form>

          <div className="divider">OR</div>

          <button
            type="button"
            className="btn btn-outline gap-2"
            onClick={handleGoogleLogin}
            disabled={isPending}
          >
            <GoogleIcon className="h-5 w-5 shrink-0" />
            {isGoogleLoginPending ? "请稍候..." : "使用 Google 登录"}
          </button>

          <div className="divider">OR</div>

          <a href="/register" className="btn btn-outline gap-2">
            <MdiAccountPlusOutline className="h-5 w-5" />
            注册账号
          </a>
        </div>
      </section>
    </main>
  );
}
