import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import AdminNotifications from "@/components/admin/AdminNotifications";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  DollarSign,
  BarChart3,
  UserPlus,
  LogOut,
  ArrowLeft,
  Shield,
} from "lucide-react";

const adminNav = [
  { label: "Visão Geral", href: "/admin", icon: LayoutDashboard },
  { label: "Contas", href: "/admin/accounts", icon: Users },
  { label: "Leads", href: "/admin/leads", icon: UserPlus },
  { label: "Financeiro", href: "/admin/financial", icon: DollarSign },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Logs", href: "/admin/logs", icon: ScrollText },
];

export default function AdminLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-[15.5rem] flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive shadow-sm">
            <Shield className="h-4 w-4 text-destructive-foreground" />
          </div>
          <div>
            <h1 className="text-[0.8125rem] font-bold text-foreground" style={{ letterSpacing: "-0.02em" }}>
              Admin
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium">Painel da Plataforma</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {adminNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-all duration-200 ease-premium ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="h-[16px] w-[16px] shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-3 border-t border-border mt-3">
            <Link
              to="/dashboard"
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-200"
            >
              <ArrowLeft className="h-[16px] w-[16px] shrink-0" />
              Voltar ao App
            </Link>
          </div>
        </nav>

        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-foreground shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.8125rem] font-medium text-foreground truncate">Administrador</p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors duration-200" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-end gap-2 border-b border-border px-6 py-3 lg:px-8">
          <AdminNotifications />
        </div>
        <div className="p-6 lg:p-8 xl:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}