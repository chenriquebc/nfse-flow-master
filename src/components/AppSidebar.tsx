import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Building2,
  ShieldCheck,
  Settings,
  LogOut,
  ChevronDown,
  Receipt,
  Shield,
  CreditCard,
  Users,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  adminOnly?: boolean;
  permission?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Notas Fiscais", href: "/invoices", icon: FileText },
  { label: "Empresas", href: "/companies", icon: Building2, permission: "can_manage_companies" },
  { label: "Certificados", href: "/certificates", icon: ShieldCheck, permission: "can_manage_companies" },
  { label: "Relatórios", href: "/reports", icon: Receipt, permission: "can_view_reports" },
  { label: "Usuários", href: "/users", icon: Users, adminOnly: true },
  { label: "Assinatura", href: "/subscription", icon: CreditCard, adminOnly: true },
  { label: "Configurações", href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  onNavigate?: () => void;
}

export default function AppSidebar({ onNavigate }: AppSidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { tenant, tenants, setCurrentTenant } = useTenant();
  const { isAdmin } = usePlatformAdmin();
  const { permissions, loading: permissionsLoading } = useUserPermissions();

  const handleNav = () => {
    onNavigate?.();
  };

  const visibleItems = permissionsLoading
    ? navItems.filter((item) => !item.adminOnly && !item.permission)
    : navItems.filter((item) => {
        if (item.adminOnly && !permissions.isAdmin) return false;
        if (item.permission && !permissions.isAdmin && !(permissions as any)[item.permission]) return false;
        return true;
      });

  return (
    <div className="flex h-full w-full flex-col bg-sidebar"
      style={{ background: "var(--gradient-sidebar)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <FileText className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">NFS-e Pro</h1>
          <p className="text-[11px] text-sidebar-muted">Emissor Nacional</p>
        </div>
      </div>

      {/* Tenant selector */}
      {tenant && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-sm text-sidebar-foreground bg-sidebar-accent hover:bg-sidebar-accent/80 transition-colors">
              <span className="truncate font-medium">{tenant.name}</span>
              <ChevronDown className="h-4 w-4 text-sidebar-muted shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {tenants.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => setCurrentTenant(t.id)}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={handleNav}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              }`}
            >
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-sidebar-border">
            <Link
              to="/admin"
              onClick={handleNav}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150"
            >
              <Shield className="h-[18px] w-[18px] shrink-0" />
              Painel Admin
            </Link>
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-foreground shrink-0">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"}
            </p>
            <p className="text-[11px] text-sidebar-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 rounded-md p-1.5 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
