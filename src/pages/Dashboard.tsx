import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  Building2,
  ShieldCheck,
  Upload,
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

interface SetupStatus {
  hasCompanies: boolean;
  hasCertificates: boolean;
  hasInvoices: boolean;
}

export default function Dashboard() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({ total: 0, authorized: 0, rejected: 0, processing: 0, totalValue: 0 });
  const [recent, setRecent] = useState<RecentInvoice[]>([]);
  const [chartData, setChartData] = useState<{ name: string; notas: number }[]>([]);
  const [setup, setSetup] = useState<SetupStatus>({ hasCompanies: false, hasCertificates: false, hasInvoices: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch companies count, certificates count, and invoices in parallel
      const [companiesRes, certificatesRes, invoicesRes] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase.from("certificates").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id),
        supabase
          .from("nfse_invoices")
          .select("status, service_value, created_at, taker_name, id, invoice_number")
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: false }),
      ]);

      setSetup({
        hasCompanies: (companiesRes.count ?? 0) > 0,
        hasCertificates: (certificatesRes.count ?? 0) > 0,
        hasInvoices: (invoicesRes.data?.length ?? 0) > 0,
      });

      const invoices = invoicesRes.data;
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

      setLoading(false);
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

  const firstName = user?.user_metadata?.full_name?.split(" ")[0] || "Usuário";
  const showSetupGuide = !setup.hasCompanies || !setup.hasCertificates || !setup.hasInvoices;

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">
              {loading ? "Dashboard" : `Olá, ${firstName}`}
            </h1>
            <p className="page-description">
              {showSetupGuide && !loading
                ? "Vamos configurar tudo para você começar a operar."
                : "Visão geral do seu escritório"}
            </p>
          </div>
          {setup.hasCompanies && (
            <Link to="/invoices/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Nota
              </Button>
            </Link>
          )}
        </div>

        {/* Setup Guide - shown when missing steps */}
        {showSetupGuide && !loading && (
          <div className="mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SetupStep
                step={1}
                title="Cadastrar empresa"
                description="Adicione sua primeira empresa ou cliente para começar."
                icon={Building2}
                done={setup.hasCompanies}
                href="/companies/new"
                cta="Cadastrar empresa"
              />
              <SetupStep
                step={2}
                title="Enviar certificado"
                description="Faça upload do certificado digital A1 da empresa."
                icon={ShieldCheck}
                done={setup.hasCertificates}
                href="/certificates"
                cta="Enviar certificado"
                disabled={!setup.hasCompanies}
              />
              <SetupStep
                step={3}
                title="Emitir primeira nota"
                description="Crie e emita sua primeira nota fiscal de serviço."
                icon={Upload}
                done={setup.hasInvoices}
                href="/invoices/new"
                cta="Emitir nota"
                disabled={!setup.hasCompanies}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        {setup.hasInvoices && (
          <>
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
                  <div className="space-y-3">
                    {recent.map((inv) => (
                      <Link
                        key={inv.id}
                        to="/invoices"
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
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Empty state when has companies but no invoices */}
        {setup.hasCompanies && !setup.hasInvoices && !loading && (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 mb-4">
                <FileText className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                Nenhuma nota emitida ainda
              </h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Tudo configurado. Emita sua primeira nota fiscal de serviço para ver o dashboard completo.
              </p>
              <Link to="/invoices/new" className="mt-6">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Emitir primeira nota
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}

function SetupStep({
  step,
  title,
  description,
  icon: Icon,
  done,
  href,
  cta,
  disabled,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ElementType;
  done: boolean;
  href: string;
  cta: string;
  disabled?: boolean;
}) {
  return (
    <Card className={done ? "opacity-60" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
              done
                ? "bg-accent/10 text-accent"
                : "bg-primary/10 text-primary"
            }`}
          >
            {done ? <CheckCircle2 className="h-5 w-5" /> : <span>{step}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
            {!done && (
              <Link to={disabled ? "#" : href}>
                <Button
                  size="sm"
                  variant={disabled ? "outline" : "default"}
                  className="mt-3"
                  disabled={disabled}
                >
                  {cta}
                  <ArrowRight className="ml-2 h-3 w-3" />
                </Button>
              </Link>
            )}
            {done && (
              <p className="text-xs text-accent font-medium mt-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Concluído
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
