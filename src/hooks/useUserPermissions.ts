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

const permissionsCache = new Map<string, UserPermissions>();

const getCacheKey = (userId?: string, tenantId?: string) => {
  if (!userId || !tenantId) return null;
  return `${userId}:${tenantId}`;
};

export function useUserPermissions() {
  const { user } = useAuth();
  const { tenant } = useTenant();

  const initialCacheKey = getCacheKey(user?.id, tenant?.id);
  const initialCachedPermissions = initialCacheKey ? permissionsCache.get(initialCacheKey) : undefined;

  const [permissions, setPermissions] = useState<UserPermissions>(initialCachedPermissions ?? NO_PERMISSIONS);
  const [loading, setLoading] = useState(!initialCachedPermissions);

  useEffect(() => {
    if (!user || !tenant) {
      setPermissions(NO_PERMISSIONS);
      setLoading(false);
      return;
    }

    const cacheKey = getCacheKey(user.id, tenant.id)!;
    const cached = permissionsCache.get(cacheKey);

    if (cached) {
      setPermissions(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let active = true;

    const fetchPermissions = async () => {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      let nextPermissions: UserPermissions;

      if (roleData?.role === "admin") {
        nextPermissions = FULL_PERMISSIONS;
      } else {
        const { data: permData } = await supabase
          .from("user_permissions")
          .select("can_view, can_emit_invoices, can_cancel_invoices, can_manage_companies, can_view_reports")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        nextPermissions = {
          isAdmin: false,
          can_view: permData?.can_view ?? true,
          can_emit_invoices: permData?.can_emit_invoices ?? false,
          can_cancel_invoices: permData?.can_cancel_invoices ?? false,
          can_manage_companies: permData?.can_manage_companies ?? false,
          can_view_reports: permData?.can_view_reports ?? false,
        };
      }

      permissionsCache.set(cacheKey, nextPermissions);

      if (!active) return;
      setPermissions(nextPermissions);
      setLoading(false);
    };

    fetchPermissions();

    return () => {
      active = false;
    };
  }, [user?.id, tenant?.id]);

  return { permissions, loading };
}
