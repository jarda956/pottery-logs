import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Like ProtectedRoute, but does NOT redirect to the mandatory 2FA setup page
// -- used by /setup-2fa itself to avoid a redirect loop.
export default function AuthOnlyRoute() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}
