import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTenant } from "@/contexts/TenantContext";

export interface UserPermissions {
  isAdmin: boolean;
  can_view: boolean;
  can_emit_invoices: boolean;
  can_cancel_invoices: boolean;
  can_manage_companies: boolean;
  can_view_reports: boolean;
}

const FULL_PERMISSIONS: UserPermissions = {
  isAdmin: true,
  can_view: true,
  can_emit_invoices: true,
  can_cancel_invoices: true,
  can_manage_companies: true,
  can_view_reports: true,
};

const NO_PERMISSIONS: UserPermissions = {
  isAdmin: false,
  can_view: false,
  can_emit_invoices: false,
  can_cancel_invoices: false,
  can_manage_companies: false,
  can_view_reports: false,
};

export function useUserPermissions() {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [permissions, setPermissions] = useState<UserPermissions>(NO_PERMISSIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !tenant) {
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      // Check if user is admin for this tenant
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      if (roleData?.role === "admin") {
        setPermissions(FULL_PERMISSIONS);
        setLoading(false);
        return;
      }

      // Not admin, check specific permissions
      const { data: permData } = await supabase
        .from("user_permissions")
        .select("can_view, can_emit_invoices, can_cancel_invoices, can_manage_companies, can_view_reports")
        .eq("user_id", user.id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      setPermissions({
        isAdmin: false,
        can_view: permData?.can_view ?? true,
        can_emit_invoices: permData?.can_emit_invoices ?? false,
        can_cancel_invoices: permData?.can_cancel_invoices ?? false,
        can_manage_companies: permData?.can_manage_companies ?? false,
        can_view_reports: permData?.can_view_reports ?? false,
      });
      setLoading(false);
    };

    fetchPermissions();
  }, [user, tenant]);

  return { permissions, loading };
}
