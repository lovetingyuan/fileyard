import { Navigate, Outlet, Route } from "react-router-dom";
import type { ReactElement } from "react";
import { AppLayout } from "./components/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import { Profile } from "./pages/Profile";
import { Register } from "./pages/Register";
import { ResetPassword } from "./pages/ResetPassword";
import { ShareDownload } from "./pages/ShareDownload";
import type { User } from "./hooks/useAuthApi";

export function renderProtectedRoute(user: User | null, element: ReactElement) {
  return user ? element : <Navigate to="/login" replace />;
}

function AuthGate({ authLoading }: { authLoading: boolean }) {
  if (authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return <Outlet />;
}

type BuildAppRouteElementsOptions = {
  allowAuthenticatedEmailAction: boolean;
  authLoading: boolean;
  onSwitchToLogin: (email?: string) => void;
  onSwitchToRegister: () => void;
  user: User | null;
};

export function buildAppRouteElements({
  allowAuthenticatedEmailAction,
  authLoading,
  onSwitchToLogin,
  onSwitchToRegister,
  user,
}: BuildAppRouteElementsOptions) {
  return (
    <>
      <Route element={<AppLayout />}>
        <Route path="share/:token" element={<ShareDownload />} />
        <Route element={<AuthGate authLoading={authLoading} />}>
          <Route
            path="login"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <Login onSwitchToRegister={onSwitchToRegister} />
              )
            }
          />
          <Route
            path="register"
            element={
              user ? (
                <Navigate to="/" replace />
              ) : (
                <Register onSwitchToLogin={onSwitchToLogin} />
              )
            }
          />
          <Route
            path="forgot-password"
            element={
              user && !allowAuthenticatedEmailAction ? (
                <Navigate to="/" replace />
              ) : (
                <ForgotPassword />
              )
            }
          />
          <Route
            path="reset-password"
            element={
              user && !allowAuthenticatedEmailAction ? (
                <Navigate to="/" replace />
              ) : (
                <ResetPassword />
              )
            }
          />
          <Route path="profile" element={renderProtectedRoute(user, <Profile />)} />
          <Route index element={renderProtectedRoute(user, <Dashboard />)} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </>
  );
}
