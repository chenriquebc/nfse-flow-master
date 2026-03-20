import { Navigate } from "react-router-dom";
import { useActivation } from "@/hooks/useActivation";

export default function ActivationGate({ children }: { children: React.ReactNode }) {
  const { mustActivate, loading } = useActivation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (mustActivate) {
    return <Navigate to="/activate" replace />;
  }

  return <>{children}</>;
}
