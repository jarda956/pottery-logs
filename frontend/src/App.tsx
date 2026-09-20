import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import AuthOnlyRoute from "./components/AuthOnlyRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TwoFactorVerifyPage from "./pages/TwoFactorVerifyPage";
import TwoFactorSetupPage from "./pages/TwoFactorSetupPage";
import FiringCurvesPage from "./pages/FiringCurvesPage";
import GlazeCombinationsPage from "./pages/GlazeCombinationsPage";
import SettingsPage from "./pages/SettingsPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";

function PublicOnly({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicOnly>
            <LoginPage />
          </PublicOnly>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnly>
            <RegisterPage />
          </PublicOnly>
        }
      />
      <Route path="/2fa-verify" element={<TwoFactorVerifyPage />} />

      <Route element={<AuthOnlyRoute />}>
        <Route path="/setup-2fa" element={<TwoFactorSetupPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/firing-curves" replace />} />
          <Route path="/firing-curves" element={<FiringCurvesPage />} />
          <Route path="/glaze-combinations" element={<GlazeCombinationsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route element={<AdminRoute />}>
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
