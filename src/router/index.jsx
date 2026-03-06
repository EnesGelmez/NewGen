import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireSuperAdmin, RequireTenantUser, RedirectIfAuthenticated } from "./guards";
import AppLayout from "../components/layout/AppLayout";
import LoginPage from "../pages/auth/LoginPage";
import ChangePasswordPage from "../pages/auth/ChangePasswordPage";
import AdminDashboard from "../pages/admin/AdminDashboard";
import TenantListPage from "../pages/admin/TenantListPage";
import NewTenantPage from "../pages/admin/NewTenantPage";
import TenantAgentPage from "../pages/admin/TenantAgentPage";
import RolesPage from "../pages/admin/RolesPage";
import TenantDashboard from "../pages/tenant/TenantDashboard";
import TenantUsersPage from "../pages/tenant/TenantUsersPage";
import IntegrationLogsPage from "../pages/tenant/IntegrationLogsPage";
import WorkflowBuilderPage from "../pages/tenant/WorkflowBuilderPage";
import WorkflowListPage from "../pages/tenant/WorkflowListPage";
import ApiEndpointsPage from "../pages/tenant/ApiEndpointsPage";
import TenantSettingsPage from "../pages/tenant/TenantSettingsPage";
import ModelsPage from "../pages/tenant/ModelsPage";
import PlaceholderPage from "../components/ui/PlaceholderPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  // Auth routes (redirect if already logged in)
  {
    element: <RedirectIfAuthenticated />,
    children: [
      { path: "/login", element: <LoginPage /> },
    ],
  },
  // First-time password change (requires token but not full auth guard)
  { path: "/change-password", element: <ChangePasswordPage /> },
  // Super Admin routes
  {
    path: "/admin",
    element: (
      <RequireSuperAdmin>
        <AppLayout />
      </RequireSuperAdmin>
    ),
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "tenants", element: <TenantListPage /> },
      { path: "tenants/new", element: <NewTenantPage /> },
      { path: "tenants/:tenantId/agent", element: <TenantAgentPage /> },
      { path: "roles", element: <RolesPage /> },
      { path: "logs", element: <PlaceholderPage title="Sistem Logları" /> },
      { path: "analytics", element: <PlaceholderPage title="Analizler & Raporlar" /> },
      { path: "settings", element: <PlaceholderPage title="Sistem Ayarları" /> },
    ],
  },
  // Tenant routes
  {
    path: "/tenant",
    element: (
      <RequireTenantUser>
        <AppLayout />
      </RequireTenantUser>
    ),
    children: [
      { index: true, element: <TenantDashboard /> },
      { path: "users", element: <TenantUsersPage /> },
      { path: "logs", element: <IntegrationLogsPage /> },
      { path: "workflows", element: <WorkflowListPage /> },
      { path: "workflows/builder", element: <WorkflowBuilderPage /> },
      { path: "workflows/builder/:workflowId", element: <WorkflowBuilderPage /> },
      { path: "api-endpoints", element: <ApiEndpointsPage /> },
      { path: "modeller", element: <ModelsPage /> },
      { path: "settings", element: <TenantSettingsPage /> },
    ],
  },
  // Catch-all
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);
