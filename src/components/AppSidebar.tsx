import { useLocation, useNavigate } from "react-router-dom";
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
  UserRound,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useNavigationGuard } from "@/contexts/NavigationGuardContext";
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
  { label: "Tomadores", href: "/takers", icon: UserRound, permission: "can_manage_companies" },
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
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { tenant, tenants, setCurrentTenant } = useTenant();
  const { isAdmin } = usePlatformAdmin();
  const { permissions, loading: permissionsLoading } = useUserPermissions();
  const { requestNavigation } = useNavigationGuard();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const navigated = requestNavigation(() => {
      navigate(href);
      onNavigate?.();
    });
  };

  const visibleItems = permissionsLoading
    ? navItems.filter((item) => !item.adminOnly && !item.permission)
    : navItems.filter((item) => {
        if (item.adminOnly && !permissions.isAdmin) return false;
        if (item.permission && !permissions.isAdmin && !(permissions as any)[item.permission]) return false;
        return true;
      });

  return (
    <div
      className="flex h-full w-full flex-col"
      style={{
        background: "linear-gradient(180deg, hsl(225, 33%, 10%) 0%, hsl(225, 33%, 6%) 100%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[hsl(225,18%,16%)]">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary/90 shadow-sm">
          <FileText className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <div>
          <h1 className="text-[0.8125rem] font-bold text-sidebar-foreground" style={{ letterSpacing: "-0.02em" }}>
            NFS-e Pro
          </h1>
          <p className="text-[10px] text-sidebar-muted font-medium" style={{ letterSpacing: "0.02em" }}>
            Emissor Nacional
          </p>
        </div>
      </div>

      {/* Tenant selector */}
      {tenant && (
        <div className="px-3 py-3 border-b border-[hsl(225,18%,16%)]">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-[0.8125rem] text-sidebar-foreground bg-sidebar-accent/60 hover:bg-sidebar-accent transition-colors duration-200">
              <span className="truncate font-medium">{tenant.name}</span>
              <ChevronDown className="h-3.5 w-3.5 text-sidebar-muted shrink-0" />
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
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavClick(e, item.href)}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium transition-all duration-200 ease-premium ${
                isActive
                  ? "bg-sidebar-primary/15 text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              }`}
            >
              <item.icon className={`h-[16px] w-[16px] shrink-0 transition-colors duration-200 ${
                isActive ? "text-sidebar-primary" : "text-sidebar-muted group-hover:text-sidebar-foreground/70"
              }`} />
              {item.label}
              {isActive && (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
              )}
            </a>
          );
        })}

        {isAdmin && (
          <div className="pt-3 mt-3 border-t border-[hsl(225,18%,16%)]">
            <a
              href="/admin"
              onClick={(e) => handleNavClick(e, "/admin")}
              className="group flex items-center gap-3 rounded-lg px-3 py-2 text-[0.8125rem] font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
            >
              <Shield className="h-[16px] w-[16px] shrink-0 text-sidebar-muted group-hover:text-sidebar-foreground/70 transition-colors duration-200" />
              Painel Admin
            </a>
          </div>
        )}
      </nav>

      {/* Theme + User footer */}
      <div className="border-t border-[hsl(225,18%,16%)] px-3 py-3 space-y-1">
        <ThemeToggle className="w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50" />
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-semibold text-sidebar-foreground shrink-0">
            {user?.email?.charAt(0).toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[0.8125rem] font-medium text-sidebar-foreground truncate">
              {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuário"}
            </p>
            <p className="text-[10px] text-sidebar-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={signOut}
            className="shrink-0 rounded-md p-1.5 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors duration-200"
            title="Sair"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}