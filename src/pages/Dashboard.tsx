import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Stats {
  total: number;
  authorized: number;
  rejected: number;
  processing: number;
  totalValue: number;
}

interface RecentInvoice {
  id: string;
  taker_name: string;
  service_value: number;
  status: string;
  created_at: string;
  invoice_number: number | null;
}

export default function Dashboard() {
  const { tenant } = useTenant();
  const [stats, setStats] = useState<Stats>({ total: 0, authorized: 0, rejected: 0, processing: 0, totalValue: 0 });
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const [chartData, setChartData] = useState<{ name: string; notas: number }[]>([]);

  useEffect(() => {
    if (!tenant) return;

    const fetchData = async () => {
      // Stats
      const { data: invoices } = await supabase
        .from("nfse_invoices")
        .select("status, service_value, created_at, taker_name, id, invoice_number")
        .eq("tenant_id", tenant.id)
        .order("created_at", { ascending: false });

      if (invoices) {
        const s: Stats = { total: invoices.length, authorized: 0, rejected: 0, processing: 0, totalValue: 0 };
        invoices.forEach((inv) => {
          if (inv.status === "authorized") { s.authorized++; s.totalValue += Number(inv.service_value); }
          if (inv.status === "rejected") s.rejected++;
          if (inv.status === "processing") s.processing++;
        });
        setStats(s);
        setRecent(invoices.slice(0, 8) as RecentInvoice[]);

        // Chart: last 6 months
        const months: Record<string, number> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const key = d.toLocaleDateString("pt-BR", { month: "short" });
          months[key] = 0;
        }
        invoices.forEach((inv) => {
          const d = new Date(inv.created_at);
          const key = d.toLocaleDateString("pt-BR", { month: "short" });
          if (key in months) months[key]++;
        });
        setChartData(Object.entries(months).map(([name, notas]) => ({ name, notas })));
      }
    };

    fetchData();
  }, [tenant]);

  const statCards = [
    { label: "Total de Notas", value: stats.total, icon: FileText, color: "text-primary" },
    { label: "Autorizadas", value: stats.authorized, icon: CheckCircle2, color: "text-success" },
    { label: "Rejeitadas", value: stats.rejected, icon: XCircle, color: "text-destructive" },
    { label: "Processando", value: stats.processing, icon: Clock, color: "text-warning" },
  ];

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-description">Visão geral do seu escritório</p>
          </div>
          <Link to="/invoices/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Nota
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {statCards.map((s) => (
            <div key={s.label} className="stat-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{s.label}</p>
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Revenue card */}
        <div className="stat-card mb-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-success" />
            <p className="text-sm font-medium text-muted-foreground">Faturamento (notas autorizadas)</p>
          </div>
          <p className="mt-2 text-3xl font-bold text-foreground">{formatCurrency(stats.totalValue)}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Notas por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={12} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="notas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
              <Link to="/invoices" className="text-sm text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent>
              {recent.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Nenhuma nota emitida ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {recent.map((inv) => (
                    <Link
                      key={inv.id}
                      to={`/invoices`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {inv.taker_name || "Sem tomador"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-sm font-medium text-foreground">
                          {formatCurrency(Number(inv.service_value))}
                        </span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
