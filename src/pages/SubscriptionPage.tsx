import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { STRIPE_PLANS, type PlanKey } from "@/lib/stripe-plans";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Crown,
  ArrowUpRight,
  ArrowDownRight,
  Check,
  ExternalLink,
  AlertTriangle,
  RefreshCcw,
  XCircle,
  Loader2,
  Star,
} from "lucide-react";
import { toast } from "sonner";

const PLAN_ORDER: PlanKey[] = ["starter", "professional", "enterprise"];

const PLAN_FEATURES: Record<PlanKey, string[]> = {
  starter: [
    "1 usuário",
    "Até 3 empresas",
    "100 NFS-e/mês",
    "Certificado Digital A1",
    "Painel de controle",
    "Suporte por e-mail",
  ],
  professional: [
    "Até 5 usuários",
    "Até 15 empresas",
    "500 NFS-e/mês",
    "Certificado Digital A1",
    "API REST Completa",
    "Importação via CSV",
    "Webhooks real-time",
    "Relatórios avançados",
    "Suporte prioritário (2h)",
  ],
  enterprise: [
    "Usuários ilimitados",
    "Empresas ilimitadas",
    "NFS-e ilimitadas",
    "API REST + Webhooks",
    "Importação em massa",
    "Multi-filiais",
    "Gerente dedicado",
    "SLA 99.9% uptime",
    "Onboarding white-glove",
  ],
};

export default function SubscriptionPage() {
  const { subscribed, plan, priceId, subscriptionEnd, loading, error, refresh } = useSubscription();
  const { session } = useAuth();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const currentPlanIndex = plan ? PLAN_ORDER.indexOf(plan) : -1;

  const handleCheckout = async (planKey: PlanKey) => {
    setActionLoading(planKey);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: STRIPE_PLANS[planKey].price_id },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Redirecionando para o checkout...");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar checkout");
    } finally {
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading("portal");
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.info("Abrindo portal do cliente...");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir portal");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = () => {
    if (!subscribed) {
      return <Badge variant="destructive" className="text-xs">Inativa</Badge>;
    }
    return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 text-xs">Ativa</Badge>;
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
  };

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-5xl">
        <div className="page-header mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="page-title flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-primary" />
                Assinatura
              </h1>
              <p className="page-description">Gerencie seu plano, pagamentos e faturas</p>
            </div>
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <p>Não foi possível conectar ao Stripe. Tente novamente em alguns minutos.</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Seu plano atual</CardTitle>
                </div>
                {!loading && getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-56" />
                </div>
              ) : subscribed && plan ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{STRIPE_PLANS[plan].name}</p>
                    <p className="text-lg text-muted-foreground">
                      R$ {STRIPE_PLANS[plan].price}<span className="text-sm">/mês</span>
                    </p>
                  </div>
                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <div>
                      <span className="font-medium text-foreground">Próxima cobrança:</span>{" "}
                      {formatDate(subscriptionEnd)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Status:</span> Ativa
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={handlePortal} disabled={actionLoading === "portal"}>
                      {actionLoading === "portal" ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1.5" />}
                      Gerenciar pagamento
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                          <XCircle className="h-4 w-4 mr-1.5" />
                          Cancelar assinatura
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Ao cancelar, você manterá o acesso ao plano <strong>{STRIPE_PLANS[plan].name}</strong> até o final do período atual ({formatDate(subscriptionEnd)}). Após essa data, seu acesso será limitado.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Voltar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handlePortal}
                          >
                            Confirmar cancelamento
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-3 rounded-full bg-muted p-3">
                    <CreditCard className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">Você ainda não possui um plano ativo</p>
                  <p className="mt-1 text-sm text-muted-foreground">Escolha um plano abaixo para começar a emitir NFS-e.</p>
                  <Button className="mt-4" onClick={() => document.getElementById("plans-section")?.scrollIntoView({ behavior: "smooth" })}>
                    Escolher um plano
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Plans */}
          <div id="plans-section">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Planos disponíveis</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {PLAN_ORDER.map((key, idx) => {
                const p = STRIPE_PLANS[key];
                const isCurrent = key === plan;
                const isHigher = idx > currentPlanIndex;
                const isPopular = key === "professional";

                return (
                  <Card
                    key={key}
                    className={`relative flex flex-col transition-shadow hover:shadow-md ${
                      isCurrent ? "border-primary ring-1 ring-primary/20" : ""
                    } ${isPopular && !isCurrent ? "border-primary/40" : ""}`}
                  >
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground shadow-sm">
                          <Star className="h-3 w-3 mr-1" /> Mais popular
                        </Badge>
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 right-4">
                        <Badge variant="secondary" className="shadow-sm">Plano atual</Badge>
                      </div>
                    )}
                    <CardHeader className="pt-6">
                      <CardTitle className="text-lg">{p.name}</CardTitle>
                      <CardDescription>
                        <span className="text-2xl font-bold text-foreground">R$ {p.price}</span>
                        <span className="text-muted-foreground">/mês</span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <ul className="space-y-2 text-sm">
                        {PLAN_FEATURES[key].map((f) => (
                          <li key={f} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {isCurrent ? (
                        <Button variant="outline" className="w-full" disabled>
                          Plano atual
                        </Button>
                      ) : (
                        <Button
                          className="w-full"
                          variant={isPopular ? "default" : "outline"}
                          disabled={actionLoading === key}
                          onClick={() => handleCheckout(key)}
                        >
                          {actionLoading === key ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : subscribed ? (
                            isHigher ? (
                              <ArrowUpRight className="h-4 w-4 mr-1.5" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 mr-1.5" />
                            )
                          ) : null}
                          {!subscribed
                            ? "Assinar este plano"
                            : isHigher
                              ? "Fazer upgrade"
                              : "Fazer downgrade"}
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Portal Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Pagamentos e faturas</CardTitle>
              </div>
              <CardDescription>
                Acesse o portal do cliente para gerenciar cartão, ver faturas e histórico de cobranças.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={handlePortal} disabled={actionLoading === "portal" || !subscribed}>
                {actionLoading === "portal" ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4 mr-1.5" />
                )}
                Abrir Portal do Cliente
              </Button>
              {!subscribed && !loading && (
                <p className="mt-2 text-xs text-muted-foreground">
                  O portal estará disponível após você assinar um plano.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
