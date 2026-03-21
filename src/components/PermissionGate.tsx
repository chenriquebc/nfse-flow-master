import { Navigate } from "react-router-dom";
import { useUserPermissions, UserPermissions } from "@/hooks/useUserPermissions";

interface PermissionGateProps {
  children: React.ReactNode;
  /** If true, only admins can access */
  adminOnly?: boolean;
  /** Permission key required (e.g. "can_manage_companies") */
  permission?: keyof Omit<UserPermissions, "isAdmin">;
}

export default function PermissionGate({ children, adminOnly, permission }: PermissionGateProps) {
  const { permissions, loading } = useUserPermissions();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (adminOnly && !permissions.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (permission && !permissions.isAdmin && !permissions[permission]) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
