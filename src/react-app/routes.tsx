import { Navigate, Outlet, Route } from "react-router-dom";
import type { ReactElement } from "react";
import { AppLayout } from "./components/AppLayout";
import { Dashboard } from "./pages/dashboard/Dashboard";
import { ForgotPassword } from "./pages/ForgotPassword";
import { Login } from "./pages/Login";
import { NotFound } from "./pages/NotFound";
import { Profile } from "./pages/profile/Profile";
import { Register } from "./pages/Register";
import { ResetPassword } from "./pages/ResetPassword";
import { ShareDownload } from "./pages/ShareDownload";
import type { User } from "../types";

function ProtectedRoute({ user, element }: { user: User | null; element: ReactElement }) {
  return user ? element : <Navigate to="/login" replace />;
}

export function renderProtectedRoute(user: User | null, element: ReactElement) {
  return <ProtectedRoute user={user} element={element} />;
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
  user: User | null;
};

export function buildAppRouteElements({
  allowAuthenticatedEmailAction,
  authLoading,
  user,
}: BuildAppRouteElementsOptions) {
  return (
    <>
      <Route element={<AppLayout />}>
        <Route path="share/:id" element={<ShareDownload />} />
        <Route element={<AuthGate authLoading={authLoading} />}>
          <Route path="login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="register" element={user ? <Navigate to="/" replace /> : <Register />} />
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
          <Route path="profile" element={<ProtectedRoute user={user} element={<Profile />} />} />
          <Route index element={<ProtectedRoute user={user} element={<Dashboard />} />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </>
  );
}
