import { useEffect, useState, useMemo } from "react";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Download, TrendingUp, TrendingDown, FileText, Building2, DollarSign, Receipt, PieChart, BarChart3, Filter } from "lucide-react";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, LineChart, Line, Tooltip } from "recharts";

interface Company {
  id: string;
  legal_name: string;
}

interface Invoice {
  id: string;
  invoice_number: number | null;
  rps_number: number | null;
  status: string;
  competence_date: string;
  taker_name: string;
  taker_document: string;
  service_value: number;
  iss_value: number;
  net_value: number;
  pis_value: number;
  cofins_value: number;
  ir_value: number;
  csll_value: number;
  inss_value: number;
  service_description: string;
  tax_code: string;
  company_id: string;
  companies: { legal_name: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  authorized: "Autorizada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
  draft: "Rascunho",
  processing: "Processando",
  substituted: "Substituída",
};

const STATUS_COLORS: Record<string, string> = {
  authorized: "hsl(152, 60%, 42%)",
  rejected: "hsl(0, 72%, 51%)",
  cancelled: "hsl(220, 10%, 50%)",
  draft: "hsl(40, 80%, 50%)",
  processing: "hsl(220, 70%, 55%)",
  substituted: "hsl(270, 50%, 55%)",
};

const CHART_COLORS = [
  "hsl(220, 70%, 45%)",
  "hsl(152, 60%, 42%)",
  "hsl(40, 80%, 50%)",
  "hsl(0, 72%, 51%)",
  "hsl(270, 50%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(330, 60%, 50%)",
  "hsl(100, 50%, 45%)",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatMonth(dateStr: string) {
  const [year, month] = dateStr.split("-");
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[parseInt(month) - 1]}/${year.slice(2)}`;
}

export default function Reports() {
  const { tenant } = useTenant();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 11);
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("all");

  useEffect(() => {
    if (!tenant) return;
    supabase
      .from("companies")
      .select("id, legal_name")
      .eq("tenant_id", tenant.id)
      .order("legal_name")
      .then(({ data }) => setCompanies((data as Company[]) || []));
  }, [tenant]);

  useEffect(() => {
    if (!tenant) return;
    setLoading(true);
    let query = supabase
      .from("nfse_invoices")
      .select("id, invoice_number, rps_number, status, competence_date, taker_name, taker_document, service_value, iss_value, net_value, pis_value, cofins_value, ir_value, csll_value, inss_value, service_description, tax_code, company_id, companies(legal_name)")
      .eq("tenant_id", tenant.id)
      .gte("competence_date", dateFrom)
      .lte("competence_date", dateTo)
      .order("competence_date");

    if (companyId !== "all") query = query.eq("company_id", companyId);
    if (status !== "all") query = query.eq("status", status as any);

    query.then(({ data }) => {
      setInvoices((data as unknown as Invoice[]) || []);
      setLoading(false);
    });
  }, [tenant, companyId, dateFrom, dateTo, status]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const authorized = invoices.filter((i) => i.status === "authorized");
    const totalService = authorized.reduce((s, i) => s + (i.service_value || 0), 0);
    const totalISS = authorized.reduce((s, i) => s + (i.iss_value || 0), 0);
    const totalNet = authorized.reduce((s, i) => s + (i.net_value || 0), 0);
    const totalRetentions = authorized.reduce(
      (s, i) => s + (i.pis_value || 0) + (i.cofins_value || 0) + (i.ir_value || 0) + (i.csll_value || 0) + (i.inss_value || 0),
      0
    );
    const uniqueTakers = new Set(authorized.map((i) => i.taker_document)).size;
    const avgTicket = authorized.length > 0 ? totalService / authorized.length : 0;

    return { totalService, totalISS, totalNet, totalRetentions, count: authorized.length, total: invoices.length, uniqueTakers, avgTicket };
  }, [invoices]);

  // ── By Status ──
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    invoices.forEach((i) => {
      map[i.status] = (map[i.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({
      name: STATUS_LABELS[name] || name,
      value,
      fill: STATUS_COLORS[name] || "hsl(220, 10%, 60%)",
    }));
  }, [invoices]);

  // ── Monthly Trend ──
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; faturamento: number; iss: number; retencoes: number; count: number }> = {};
    invoices
      .filter((i) => i.status === "authorized")
      .forEach((i) => {
        const key = i.competence_date.slice(0, 7);
        if (!map[key]) map[key] = { month: key, faturamento: 0, iss: 0, retencoes: 0, count: 0 };
        map[key].faturamento += i.service_value || 0;
        map[key].iss += i.iss_value || 0;
        map[key].retencoes += (i.pis_value || 0) + (i.cofins_value || 0) + (i.ir_value || 0) + (i.csll_value || 0) + (i.inss_value || 0);
        map[key].count += 1;
      });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [invoices]);

  // ── By Company ──
  const companyData = useMemo(() => {
    const map: Record<string, { name: string; faturamento: number; iss: number; retencoes: number; liquido: number; count: number }> = {};
    invoices
      .filter((i) => i.status === "authorized")
      .forEach((i) => {
        const name = i.companies?.legal_name || "Sem empresa";
        if (!map[name]) map[name] = { name, faturamento: 0, iss: 0, retencoes: 0, liquido: 0, count: 0 };
        map[name].faturamento += i.service_value || 0;
        map[name].iss += i.iss_value || 0;
        map[name].retencoes += (i.pis_value || 0) + (i.cofins_value || 0) + (i.ir_value || 0) + (i.csll_value || 0) + (i.inss_value || 0);
        map[name].liquido += i.net_value || 0;
        map[name].count += 1;
      });
    return Object.values(map).sort((a, b) => b.faturamento - a.faturamento);
  }, [invoices]);

  // ── Top Takers ──
  const topTakers = useMemo(() => {
    const map: Record<string, { name: string; doc: string; total: number; count: number }> = {};
    invoices
      .filter((i) => i.status === "authorized")
      .forEach((i) => {
        const key = i.taker_document;
        if (!map[key]) map[key] = { name: i.taker_name, doc: i.taker_document, total: 0, count: 0 };
        map[key].total += i.service_value || 0;
        map[key].count += 1;
      });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [invoices]);

  // ── By Service (tax_code) ──
  const serviceData = useMemo(() => {
    const map: Record<string, { code: string; total: number; count: number }> = {};
    invoices
      .filter((i) => i.status === "authorized")
      .forEach((i) => {
        const code = i.tax_code || "N/A";
        if (!map[code]) map[code] = { code, total: 0, count: 0 };
        map[code].total += i.service_value || 0;
        map[code].count += 1;
      });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [invoices]);

  // ── Company bar chart data ──
  const companyBarData = useMemo(() => {
    return companyData.slice(0, 8).map((c, i) => ({
      name: c.name.length > 20 ? c.name.slice(0, 18) + "…" : c.name,
      value: c.faturamento,
      fill: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [companyData]);

  const exportCSV = () => {
    if (!invoices.length) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    const headers = [
      "Número", "Status", "Competência", "Tomador", "CPF/CNPJ Tomador",
      "Valor Serviço", "ISS", "PIS", "COFINS", "IR", "CSLL", "INSS",
      "Valor Líquido", "Cód. Serviço", "Empresa"
    ];
    const rows = invoices.map((inv) => [
      inv.invoice_number || inv.rps_number || "",
      STATUS_LABELS[inv.status] || inv.status,
      inv.competence_date,
      inv.taker_name,
      inv.taker_document,
      inv.service_value,
      inv.iss_value,
      inv.pis_value || 0,
      inv.cofins_value || 0,
      inv.ir_value || 0,
      inv.csll_value || 0,
      inv.inss_value || 0,
      inv.net_value,
      inv.tax_code,
      inv.companies?.legal_name || "",
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_nfse_${dateFrom}_${dateTo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado!");
  };

  const monthlyChartConfig = {
    faturamento: { label: "Faturamento", color: "hsl(220, 70%, 45%)" },
    iss: { label: "ISS", color: "hsl(152, 60%, 42%)" },
    retencoes: { label: "Retenções", color: "hsl(0, 72%, 51%)" },
  };

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Relatórios</h1>
            <p className="text-sm text-muted-foreground">Visão consolidada de todas as operações fiscais</p>
          </div>
          <Button onClick={exportCSV} variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Filtros</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Empresa</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="authorized">Autorizada</SelectItem>
                    <SelectItem value="rejected">Rejeitada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Input type="date" className="h-9 text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Input type="date" className="h-9 text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icon={DollarSign} label="Faturamento" value={formatCurrency(kpis.totalService)} sub={`${kpis.count} notas autorizadas`} color="text-primary" />
          <KpiCard icon={Receipt} label="ISS Total" value={formatCurrency(kpis.totalISS)} sub={kpis.totalService > 0 ? `${((kpis.totalISS / kpis.totalService) * 100).toFixed(1)}% do faturamento` : "—"} color="text-accent" />
          <KpiCard icon={TrendingDown} label="Retenções" value={formatCurrency(kpis.totalRetentions)} sub="PIS + COFINS + IR + CSLL + INSS" color="text-destructive" />
          <KpiCard icon={TrendingUp} label="Valor Líquido" value={formatCurrency(kpis.totalNet)} sub={`Ticket médio: ${formatCurrency(kpis.avgTicket)}`} color="text-primary" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Monthly Trend */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Evolução Mensal</CardTitle>
              <CardDescription className="text-xs">Faturamento, ISS e retenções por competência</CardDescription>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ChartContainer config={monthlyChartConfig} className="h-[260px] w-full">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tickFormatter={formatMonth} className="text-xs" />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                    <ChartTooltip content={<ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />} />
                    <Bar dataKey="faturamento" fill="var(--color-faturamento)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="iss" fill="var(--color-iss)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="retencoes" fill="var(--color-retencoes)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState text="Nenhuma nota autorizada no período" />
              )}
            </CardContent>
          </Card>

          {/* Status Pie */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
              <CardDescription className="text-xs">{invoices.length} notas no período</CardDescription>
            </CardHeader>
            <CardContent>
              {statusData.length > 0 ? (
                <div className="h-[260px] flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <RPieChart>
                      <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={2}>
                        {statusData.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${value} notas`, name]} />
                    </RPieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState text="Sem dados" />
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
                {statusData.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ background: s.fill }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs: Companies / Takers / Services */}
        <Tabs defaultValue="companies">
          <TabsList>
            <TabsTrigger value="companies" className="text-xs"><Building2 className="mr-1.5 h-3.5 w-3.5" />Por Empresa</TabsTrigger>
            <TabsTrigger value="takers" className="text-xs"><FileText className="mr-1.5 h-3.5 w-3.5" />Top Tomadores</TabsTrigger>
            <TabsTrigger value="services" className="text-xs"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Por Serviço</TabsTrigger>
          </TabsList>

          {/* By Company */}
          <TabsContent value="companies">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Consolidado por Empresa</CardTitle>
                <CardDescription className="text-xs">Apenas notas autorizadas</CardDescription>
              </CardHeader>
              <CardContent>
                {companyData.length > 0 ? (
                  <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                    <div className="xl:col-span-3 overflow-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Empresa</TableHead>
                            <TableHead className="text-xs text-right">Notas</TableHead>
                            <TableHead className="text-xs text-right">Faturamento</TableHead>
                            <TableHead className="text-xs text-right">ISS</TableHead>
                            <TableHead className="text-xs text-right">Retenções</TableHead>
                            <TableHead className="text-xs text-right">Líquido</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyData.map((c) => (
                            <TableRow key={c.name}>
                              <TableCell className="text-sm font-medium max-w-[200px] truncate">{c.name}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{c.count}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatCurrency(c.faturamento)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatCurrency(c.iss)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatCurrency(c.retencoes)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums font-medium">{formatCurrency(c.liquido)}</TableCell>
                            </TableRow>
                          ))}
                          {companyData.length > 1 && (
                            <TableRow className="bg-muted/50 font-semibold">
                              <TableCell className="text-sm">Total</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{companyData.reduce((s, c) => s + c.count, 0)}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatCurrency(companyData.reduce((s, c) => s + c.faturamento, 0))}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatCurrency(companyData.reduce((s, c) => s + c.iss, 0))}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatCurrency(companyData.reduce((s, c) => s + c.retencoes, 0))}</TableCell>
                              <TableCell className="text-sm text-right tabular-nums">{formatCurrency(companyData.reduce((s, c) => s + c.liquido, 0))}</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="xl:col-span-2">
                      <p className="text-xs text-muted-foreground mb-2 font-medium">Faturamento por Empresa</p>
                      <div className="h-[240px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={companyBarData} layout="vertical" margin={{ left: 0 }}>
                            <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                            <YAxis type="category" dataKey="name" width={110} className="text-xs" />
                            <Tooltip formatter={(value: number) => formatCurrency(value)} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {companyBarData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState text="Nenhuma nota autorizada no período" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Top Takers */}
          <TabsContent value="takers">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Top 10 Tomadores por Volume</CardTitle>
                <CardDescription className="text-xs">Clientes que mais contrataram serviços</CardDescription>
              </CardHeader>
              <CardContent>
                {topTakers.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-8">#</TableHead>
                        <TableHead className="text-xs">Tomador</TableHead>
                        <TableHead className="text-xs">CPF/CNPJ</TableHead>
                        <TableHead className="text-xs text-right">Notas</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                        <TableHead className="text-xs text-right">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topTakers.map((t, i) => (
                        <TableRow key={t.doc}>
                          <TableCell className="text-sm text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="text-sm font-medium max-w-[200px] truncate">{t.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{t.doc}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{t.count}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{formatCurrency(t.total)}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            {kpis.totalService > 0 ? ((t.total / kpis.totalService) * 100).toFixed(1) + "%" : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState text="Nenhum tomador encontrado" />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* By Service Code */}
          <TabsContent value="services">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Consolidado por Código de Serviço</CardTitle>
                <CardDescription className="text-xs">Agrupamento por código tributário (LC 116)</CardDescription>
              </CardHeader>
              <CardContent>
                {serviceData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Cód. Serviço</TableHead>
                        <TableHead className="text-xs text-right">Qtd. Notas</TableHead>
                        <TableHead className="text-xs text-right">Total Faturado</TableHead>
                        <TableHead className="text-xs text-right">% do Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {serviceData.map((s) => (
                        <TableRow key={s.code}>
                          <TableCell className="text-sm font-mono font-medium">{s.code}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{s.count}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">{formatCurrency(s.total)}</TableCell>
                          <TableCell className="text-sm text-right tabular-nums">
                            {kpis.totalService > 0 ? ((s.total / kpis.totalService) * 100).toFixed(1) + "%" : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <EmptyState text="Nenhum serviço encontrado" />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg p-2 bg-muted ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold tabular-nums truncate">{value}</p>
            <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
      <PieChart className="mr-2 h-5 w-5 opacity-40" />
      {text}
    </div>
  );
}
