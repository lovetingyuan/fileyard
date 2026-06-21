import { BrowserRouter, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./auth/useAuth";
import { buildAppRouteElements } from "./routes";
import { allowsAuthenticatedEmailActionPath } from "./utils/authRouteAccess";
import { TopBanner } from "./components/TopBanner";
export { renderProtectedRoute } from "./routes";

function AppContent() {
  const { authLoading, user } = useAuth();
  const location = useLocation();
  const allowAuthenticatedEmailAction = allowsAuthenticatedEmailActionPath(location.pathname);

  return (
    <Routes>
      {buildAppRouteElements({
        user,
        authLoading,
        allowAuthenticatedEmailAction,
      })}
    </Routes>
  );
}

function AppShell() {
  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden">
      <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      <TopBanner />
      <AppContent />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

export default App;
