import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AdminLogin } from "./pages/AdminLogin";
import { AdminUsersPage } from "./pages/AdminUsersPage";

export function AdminApp() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" toastOptions={{ duration: 5000 }} />
      <Routes>
        <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/" element={<Navigate to="/admin/users" replace />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/users" element={<AdminUsersPage />} />
        <Route path="/admin/users/" element={<AdminUsersPage />} />
        <Route path="*" element={<Navigate to="/admin/users" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
