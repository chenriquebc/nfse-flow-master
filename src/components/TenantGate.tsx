import { Navigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";

export default function TenantGate({ children }: { children: React.ReactNode }) {
  const { tenant, tenants, loading } = useTenant();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!tenant && tenants.length === 0) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
