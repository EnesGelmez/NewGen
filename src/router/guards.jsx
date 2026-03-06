import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export function RequireAuth({ children }) {
  const { isAuthenticated, mustChangePassword } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  return children || <Outlet />;
}

export function RequireSuperAdmin({ children }) {
  const { isAuthenticated, isSuperAdmin, mustChangePassword } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!isSuperAdmin()) return <Navigate to="/tenant" replace />;
  return children || <Outlet />;
}

export function RequireTenantUser({ children }) {
  const { isAuthenticated, isTenantUser, mustChangePassword } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  if (!isTenantUser()) return <Navigate to="/admin" replace />;
  return children || <Outlet />;
}

export function RedirectIfAuthenticated() {
  const { isAuthenticated, isSuperAdmin } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to={isSuperAdmin() ? "/admin" : "/tenant"} replace />;
  }
  return <Outlet />;
}
