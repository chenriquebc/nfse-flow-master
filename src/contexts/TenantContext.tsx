import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Tenant {
  id: string;
  name: string;
  document: string;
  email: string;
  plan: string;
  is_active: boolean;
}

interface TenantContextType {
  tenant: Tenant | null;
  tenants: Tenant[];
  loading: boolean;
  setCurrentTenant: (id: string) => void;
  createTenant: (name: string, document?: string, email?: string) => Promise<string | null>;
  refetch: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTenants = async () => {
    if (!userId) {
      setTenants([]);
      setTenant(null);
      // Mantém loading ativo até o auth confirmar uma sessão válida
      setLoading(true);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.from("tenants").select("*");

    if (!error && data && data.length > 0) {
      const mapped = data as Tenant[];
      setTenants(mapped);
      const stored = localStorage.getItem("current_tenant_id");
      const found = mapped.find((t) => t.id === stored);
      setTenant(found || mapped[0]);
    } else {
      setTenants([]);
      setTenant(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }
    fetchTenants();
  }, [userId, authLoading]);

  const setCurrentTenant = (id: string) => {
    const found = tenants.find(t => t.id === id);
    if (found) {
      setTenant(found);
      localStorage.setItem("current_tenant_id", id);
    }
  };

  const createTenant = async (name: string, document = "", email = ""): Promise<string | null> => {
    const { data, error } = await supabase.rpc("create_tenant_for_user", {
      _tenant_name: name,
      _tenant_document: document,
      _tenant_email: email,
    });
    if (error) return null;
    await fetchTenants();
    return data as string;
  };

  return (
    <TenantContext.Provider value={{ tenant, tenants, loading, setCurrentTenant, createTenant, refetch: fetchTenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) throw new Error("useTenant must be used within TenantProvider");
  return context;
}
