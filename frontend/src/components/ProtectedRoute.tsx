import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  if (user.mustSetupTwoFactor && location.pathname !== "/setup-2fa") {
    return <Navigate to="/setup-2fa" replace />;
  }

  return <Outlet />;
}
