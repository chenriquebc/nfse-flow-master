import { Link, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  ScrollText,
  DollarSign,
  BarChart3,
  LogOut,
  ArrowLeft,
  Shield,
} from "lucide-react";

const adminNav = [
  { label: "Visão Geral", href: "/admin", icon: LayoutDashboard },
  { label: "Contas", href: "/admin/accounts", icon: Users },
  { label: "Logs", href: "/admin/logs", icon: ScrollText },
];

export default function AdminLayout() {
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive">
            <Shield className="h-5 w-5 text-destructive-foreground" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight">Admin</h1>
            <p className="text-[11px] text-muted-foreground">Painel da Plataforma</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {adminNav.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            );
          })}

          <div className="pt-4 border-t border-border mt-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ArrowLeft className="h-[18px] w-[18px] shrink-0" />
              Voltar ao App
            </Link>
          </div>
        </nav>

        <div className="border-t border-border px-3 py-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">Administrador</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button onClick={signOut} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted" title="Sair">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}
