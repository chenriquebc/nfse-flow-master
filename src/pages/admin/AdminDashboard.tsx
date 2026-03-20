import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, Building2, TrendingUp, TrendingDown, AlertTriangle,
  DollarSign, ArrowUpRight, ArrowDownRight, Activity, Eye,
  UserPlus, CreditCard, BarChart3
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell
} from "recharts";

interface Metrics {
  totalTenants: number;
  activeTenants: number;
  trialingTenants: number;
  suspendedTenants: number;
  basicCount: number;
  professionalCount: number;
  enterpriseCount: number;
  newThisMonth: number;
  churnedThisMonth: number;
}

interface RecentActivity {
  id: string;
  type: "signup" | "upgrade" | "cancel" | "payment";
  description: string;
  time: string;
}

// Plan pricing for MRR calculation
const PLAN_PRICES: Record<string, number> = {
  basic: 97,
  professional: 197,
  enterprise: 497,
};

const PLAN_COLORS = ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--chart-3))"];

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<Metrics>({
    totalTenants: 0, activeTenants: 0, trialingTenants: 0,
    suspendedTenants: 0, basicCount: 0, professionalCount: 0,
    enterpriseCount: 0, newThisMonth: 0, churnedThisMonth: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentTenants, setRecentTenants] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: tenants } = await supabase
        .from("tenants")
        .select("*")
        .order("created_at", { ascending: false });

      if (tenants) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        setMetrics({
          totalTenants: tenants.length,
          activeTenants: tenants.filter(t => t.subscription_status === "active").length,
          trialingTenants: tenants.filter(t => t.subscription_status === "trialing").length,
          suspendedTenants: tenants.filter(t => !t.is_active).length,
          basicCount: tenants.filter(t => t.plan === "basic" && t.is_active).length,
          professionalCount: tenants.filter(t => t.plan === "professional" && t.is_active).length,
          enterpriseCount: tenants.filter(t => t.plan === "enterprise" && t.is_active).length,
          newThisMonth: tenants.filter(t => new Date(t.created_at) >= startOfMonth).length,
          churnedThisMonth: tenants.filter(t =>
            !t.is_active && t.updated_at && new Date(t.updated_at) >= startOfMonth
          ).length,
        });
        setRecentTenants(tenants.slice(0, 8));
      }
      setLoading(false);
    };
    load();
  }, []);

  const mrr = (metrics.basicCount * PLAN_PRICES.basic)
    + (metrics.professionalCount * PLAN_PRICES.professional)
    + (metrics.enterpriseCount * PLAN_PRICES.enterprise);

  const arr = mrr * 12;
  const churnRate = metrics.totalTenants > 0
    ? ((metrics.churnedThisMonth / metrics.totalTenants) * 100).toFixed(1)
    : "0.0";
  const conversionRate = metrics.trialingTenants + metrics.activeTenants > 0
    ? ((metrics.activeTenants / (metrics.trialingTenants + metrics.activeTenants)) * 100).toFixed(0)
    : "0";

  // Mock revenue trend (will be replaced by real Stripe data)
  const revenueTrend = [
    { month: "Out", mrr: 0 },
    { month: "Nov", mrr: 0 },
    { month: "Dez", mrr: 0 },
    { month: "Jan", mrr: Math.round(mrr * 0.3) },
    { month: "Fev", mrr: Math.round(mrr * 0.6) },
    { month: "Mar", mrr },
  ];

  const planDistribution = [
    { name: "Basic", value: metrics.basicCount, price: "R$ 97" },
    { name: "Professional", value: metrics.professionalCount, price: "R$ 197" },
    { name: "Enterprise", value: metrics.enterpriseCount, price: "R$ 497" },
  ];

  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    active: { label: "Ativo", variant: "default" },
    trialing: { label: "Trial", variant: "secondary" },
    past_due: { label: "Inadimplente", variant: "destructive" },
    canceled: { label: "Cancelado", variant: "outline" },
    suspended: { label: "Suspenso", variant: "destructive" },
  };

  const kpiCards = [
    {
      label: "MRR",
      value: `R$ ${mrr.toLocaleString("pt-BR")}`,
      subtitle: `ARR: R$ ${arr.toLocaleString("pt-BR")}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Contas Ativas",
      value: metrics.activeTenants,
      subtitle: `${metrics.newThisMonth} novas este mês`,
      icon: Building2,
      color: "text-primary",
      bgColor: "bg-primary/10",
      trend: metrics.newThisMonth > 0 ? "up" : undefined,
    },
    {
      label: "Em Trial",
      value: metrics.trialingTenants,
      subtitle: `${conversionRate}% conversão`,
      icon: UserPlus,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Churn Rate",
      value: `${churnRate}%`,
      subtitle: `${metrics.churnedThisMonth} cancelamento(s)`,
      icon: TrendingDown,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      trend: metrics.churnedThisMonth > 0 ? "down" : undefined,
    },
  ];

  const operationalCards = [
    { label: "Total de Contas", value: metrics.totalTenants, icon: Users, color: "text-muted-foreground" },
    { label: "Suspensas", value: metrics.suspendedTenants, icon: AlertTriangle, color: "text-destructive" },
    { label: "Taxa de Ativação", value: `${conversionRate}%`, icon: Activity, color: "text-primary" },
    { label: "Ticket Médio", value: metrics.activeTenants > 0 ? `R$ ${Math.round(mrr / metrics.activeTenants)}` : "R$ 0", icon: CreditCard, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground">Métricas de negócio em tempo real</p>
        </div>
        <Badge variant="outline" className="text-xs gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Atualizado agora
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map(card => (
          <Card key={card.label} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {loading ? "—" : card.value}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {card.trend === "up" && <ArrowUpRight className="h-3 w-3 text-emerald-500" />}
                {card.trend === "down" && <ArrowDownRight className="h-3 w-3 text-destructive" />}
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Evolução do MRR</CardTitle>
              <Badge variant="secondary" className="text-xs">Últimos 6 meses</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={v => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "MRR"]}
                  />
                  <Area type="monotone" dataKey="mrr" stroke="hsl(var(--primary))" fill="url(#mrrGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Distribuição de Planos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {planDistribution.map((_, i) => (
                      <Cell key={i} fill={PLAN_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    formatter={(value: number, name: string) => [`${value} contas`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {planDistribution.map((plan, i) => (
                <div key={plan.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PLAN_COLORS[i] }} />
                    <span className="text-muted-foreground">{plan.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{loading ? "—" : plan.value}</span>
                    <span className="text-xs text-muted-foreground">{plan.price}/mês</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operational Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {operationalCards.map(card => (
          <Card key={card.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <card.icon className={`h-5 w-5 ${card.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="text-lg font-bold text-foreground">{loading ? "—" : card.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Row: Landing Page Metrics + Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Landing Page Metrics Placeholder */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Landing Page</CardTitle>
              <Badge variant="outline" className="text-xs">Em breve</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Visitantes (mês)", value: "—", icon: Eye },
                { label: "Leads Captados", value: "—", icon: UserPlus },
                { label: "Taxa de Conversão", value: "—", icon: TrendingUp },
                { label: "Trials Iniciados", value: "—", icon: BarChart3 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-3 rounded-lg border border-dashed border-border p-3">
                  <item.icon className="h-4 w-4 text-muted-foreground/50" />
                  <div>
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-sm font-semibold text-muted-foreground/50">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Conecte o Google Analytics ou pixel de tracking para dados em tempo real.
            </p>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {loading ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>
              ) : recentTenants.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">Nenhuma atividade</div>
              ) : (
                recentTenants.map(t => {
                  const st = statusMap[t.subscription_status] || statusMap.trialing;
                  return (
                    <div key={t.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                          {t.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{t.email || t.document}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={st.variant} className="text-[10px]">{st.label}</Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
