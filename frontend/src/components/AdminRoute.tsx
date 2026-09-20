import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user || user.role !== "ADMIN") return <Navigate to="/" replace />;
  if (user.mustSetupTwoFactor) return <Navigate to="/setup-2fa" replace />;

  return <Outlet />;
}
