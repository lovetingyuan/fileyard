import { BrowserRouter, Routes, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { buildAppRouteElements } from "./routes";
import { allowsAuthenticatedEmailActionPath } from "./utils/authRouteAccess";
import { TopBanner } from "./components/TopBanner";
export { renderProtectedRoute } from "./routes";

function AppContent() {
  const { authLoading, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const allowAuthenticatedEmailAction = allowsAuthenticatedEmailActionPath(location.pathname);

  const handleSwitchToRegister = () => {
    navigate("/register");
  };

  const handleSwitchToLogin = (email?: string) => {
    const search = email ? `?email=${encodeURIComponent(email)}&registered=1` : "";
    navigate(`/login${search}`);
  };

  return (
    <Routes>
      {buildAppRouteElements({
        user,
        authLoading,
        allowAuthenticatedEmailAction,
        onSwitchToRegister: handleSwitchToRegister,
        onSwitchToLogin: handleSwitchToLogin,
      })}
    </Routes>
  );
}

function AppRoutes() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export function AppShell() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      <TopBanner />
      <AppRoutes />
    </>
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
