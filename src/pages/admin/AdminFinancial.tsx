import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, TrendingUp, CreditCard, Receipt, AlertCircle } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from "recharts";

const PLAN_PRICES: Record<string, number> = {
  basic: 97,
  professional: 197,
  enterprise: 497,
};

export default function AdminFinancial() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
      if (data) setTenants(data);
      setLoading(false);
    };
    load();
  }, []);

  const activeTenants = tenants.filter(t => t.subscription_status === "active");
  const mrr = activeTenants.reduce((sum, t) => sum + (PLAN_PRICES[t.plan] || 0), 0);
  const pastDue = tenants.filter(t => t.subscription_status === "past_due");

  // Revenue by plan
  const revenueByPlan = [
    { plan: "Basic", receita: activeTenants.filter(t => t.plan === "basic").length * PLAN_PRICES.basic, contas: activeTenants.filter(t => t.plan === "basic").length },
    { plan: "Professional", receita: activeTenants.filter(t => t.plan === "professional").length * PLAN_PRICES.professional, contas: activeTenants.filter(t => t.plan === "professional").length },
    { plan: "Enterprise", receita: activeTenants.filter(t => t.plan === "enterprise").length * PLAN_PRICES.enterprise, contas: activeTenants.filter(t => t.plan === "enterprise").length },
  ];

  const kpis = [
    { label: "MRR", value: `R$ ${mrr.toLocaleString("pt-BR")}`, icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "ARR Projetado", value: `R$ ${(mrr * 12).toLocaleString("pt-BR")}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
    { label: "Inadimplentes", value: pastDue.length, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Ticket Médio", value: activeTenants.length > 0 ? `R$ ${Math.round(mrr / activeTenants.length)}` : "R$ 0", icon: CreditCard, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-muted-foreground">Receita, inadimplência e métricas financeiras</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <div className={`rounded-lg p-2 ${k.bg}`}>
                <k.icon className={`h-4 w-4 ${k.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{loading ? "—" : k.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue by plan chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Receita por Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByPlan}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="plan" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(value: number, name: string) => [
                    name === "receita" ? `R$ ${value.toLocaleString("pt-BR")}` : value,
                    name === "receita" ? "Receita" : "Contas"
                  ]}
                />
                <Bar dataKey="receita" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Payment history placeholder */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Histórico de Pagamentos</CardTitle>
          <Badge variant="outline" className="text-xs">Stripe pendente</Badge>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Receipt className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Integração com Stripe</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Quando o Stripe for conectado, os pagamentos, invoices e cobranças aparecerão aqui automaticamente.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Overdue accounts */}
      {pastDue.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-destructive">Contas Inadimplentes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pastDue.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.email}</p>
                    </TableCell>
                    <TableCell className="capitalize">{t.plan}</TableCell>
                    <TableCell>R$ {PLAN_PRICES[t.plan] || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
