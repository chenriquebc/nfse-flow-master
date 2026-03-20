import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, TrendingUp, AlertTriangle } from "lucide-react";

interface Metrics {
  totalTenants: number;
  activeTenants: number;
  trialingTenants: number;
  suspendedTenants: number;
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({ totalTenants: 0, activeTenants: 0, trialingTenants: 0, suspendedTenants: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: tenants } = await supabase.from("tenants").select("subscription_status, is_active");

      if (tenants) {
        setMetrics({
          totalTenants: tenants.length,
          activeTenants: tenants.filter(t => t.subscription_status === "active").length,
          trialingTenants: tenants.filter(t => t.subscription_status === "trialing").length,
          suspendedTenants: tenants.filter(t => !t.is_active).length,
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const cards = [
    { label: "Total de Contas", value: metrics.totalTenants, icon: Building2, color: "text-primary" },
    { label: "Assinaturas Ativas", value: metrics.activeTenants, icon: TrendingUp, color: "text-accent" },
    { label: "Em Trial", value: metrics.trialingTenants, icon: Users, color: "text-warning" },
    { label: "Suspensas", value: metrics.suspendedTenants, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground">Visão geral da plataforma</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(card => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {loading ? "—" : card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
