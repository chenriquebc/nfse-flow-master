import { Link } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubscriptionBanner() {
  const { subscribed, loading } = useSubscription();

  if (loading || subscribed) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-amber-300/50 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">Seu plano está inativo. Acesse a aba Assinatura para regularizar.</span>
      <Button asChild size="sm" variant="outline" className="border-amber-400 text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40">
        <Link to="/subscription">Ir para Assinatura</Link>
      </Button>
    </div>
  );
}
