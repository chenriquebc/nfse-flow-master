import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPlanByPriceId, getPlanByProductId, STRIPE_PLANS, type PlanKey } from "@/lib/stripe-plans";

export interface SubscriptionData {
  subscribed: boolean;
  plan: PlanKey | null;
  productId: string | null;
  priceId: string | null;
  subscriptionEnd: string | null;
}

export function useSubscription() {
  const { session } = useAuth();
  const [data, setData] = useState<SubscriptionData>({
    subscribed: false,
    plan: null,
    productId: null,
    priceId: null,
    subscriptionEnd: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkSubscription = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data: result, error: fnError } = await supabase.functions.invoke("check-subscription");

      if (fnError) throw new Error(fnError.message);

      if (result?.error) throw new Error(result.error);

      const plan = result?.price_id
        ? getPlanByPriceId(result.price_id)
        : result?.product_id
          ? getPlanByProductId(result.product_id)
          : null;

      setData({
        subscribed: result?.subscribed ?? false,
        plan,
        productId: result?.product_id ?? null,
        priceId: result?.price_id ?? null,
        subscriptionEnd: result?.subscription_end ?? null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao verificar assinatura";
      setError(msg);
      console.error("[useSubscription]", msg);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    checkSubscription();

    // Auto-refresh every 60s
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  return { ...data, loading, error, refresh: checkSubscription };
}
