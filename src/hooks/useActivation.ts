import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useActivation() {
  const { user } = useAuth();
  const [mustActivate, setMustActivate] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMustActivate(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("user_id", user.id)
        .single();

      setMustActivate(!!data?.must_change_password);
      setLoading(false);
    };

    check();
  }, [user]);

  return { mustActivate, loading };
}
