import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Users,
  Shield,
  Settings,
  Activity,
  Zap,
  ChevronDown,
  LogOut,
  BarChart3,
  List,
  Braces,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuthStore } from "../../store/authStore";

const superAdminNav = [
  {
    section: "Genel",
    items: [
      { to: "/admin", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/admin/tenants", icon: Building2, label: "Tenant Yönetimi" },
      { to: "/admin/roles", icon: Shield, label: "Roller & Yetkiler" },
    ],
  },
  {
    section: "İzleme",
    items: [
      { to: "/admin/logs", icon: Activity, label: "Sistem Logları" },
      { to: "/admin/analytics", icon: BarChart3, label: "Analizler" },
    ],
  },
  {
    section: "Sistem",
    items: [
      { to: "/admin/settings", icon: Settings, label: "Ayarlar" },
    ],
  },
];

const tenantNav = [
  {
    section: "Genel",
    items: [
      { to: "/tenant", icon: LayoutDashboard, label: "Dashboard", end: true },
      { to: "/tenant/users", icon: Users, label: "Kullanıcılar" },
    ],
  },
  {
    section: "Entegrasyon",
    items: [
      { to: "/tenant/logs", icon: Activity, label: "Entegrasyon Logları" },
      { to: "/tenant/workflows", icon: List, label: "Workflow Yönetimi" },
      { to: "/tenant/modeller", icon: Braces, label: "Modeller" },
    ],
  },
  {
    section: "Sistem",
    items: [
      { to: "/tenant/settings", icon: Settings, label: "Ayarlar" },
    ],
  },
];

function NavItem({ item }) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
          isActive
            ? "bg-white/20 text-white"
            : "text-white/60 hover:text-white hover:bg-white/10"
        )
      }
    >
      <item.icon size={17} strokeWidth={1.8} />
      <span>{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const { user, logout, isSuperAdmin } = useAuthStore();
  const nav = isSuperAdmin() ? superAdminNav : tenantNav;

  return (
    <aside className="flex h-screen w-64 flex-col bg-gradient-to-b from-slate-900 to-slate-800 text-white flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 shadow-lg">
          <Zap size={18} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-wide">Nexus</p>
          <p className="text-[10px] text-white/40 uppercase tracking-widest">
            Integration Platform
          </p>
        </div>
      </div>

      {/* Role Badge */}
      <div className="px-5 py-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/80 uppercase tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {isSuperAdmin() ? "Super Admin" : user?.tenantName || "Tenant"}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {nav.map((section) => (
          <div key={section.section}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              {section.section}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItem key={item.to} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white flex-shrink-0">
            {user?.name?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-white/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            title="Çıkış Yap"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
