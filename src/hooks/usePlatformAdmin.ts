import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function usePlatformAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase.rpc("is_platform_admin", { _user_id: user.id });
      setIsAdmin(!!data);
      setLoading(false);
    };

    check();
  }, [user]);

  return { isAdmin, loading };
}
