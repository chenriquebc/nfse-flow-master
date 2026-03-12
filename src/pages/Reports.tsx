import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  legal_name: string;
}

export default function Reports() {
  const { tenant } = useTenant();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("all");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
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

  const exportCSV = async () => {
    if (!tenant) return;
    let query = supabase
      .from("nfse_invoices")
      .select("*, companies(legal_name)")
      .eq("tenant_id", tenant.id)
      .gte("competence_date", dateFrom)
      .lte("competence_date", dateTo)
      .order("competence_date");

    if (companyId !== "all") query = query.eq("company_id", companyId);
    if (status !== "all") query = query.eq("status", status);

    const { data } = await query;
    if (!data || data.length === 0) {
      toast.error("Nenhum dado encontrado para os filtros selecionados");
      return;
    }

    const headers = [
      "Número", "Status", "Competência", "Tomador", "CPF/CNPJ Tomador",
      "Valor Serviço", "ISS", "Valor Líquido", "Empresa"
    ];

    const rows = (data as any[]).map((inv) => [
      inv.invoice_number || inv.rps_number || "",
      inv.status,
      inv.competence_date,
      inv.taker_name,
      inv.taker_document,
      inv.service_value,
      inv.iss_value,
      inv.net_value,
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

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-3xl">
        <div className="page-header">
          <h1 className="page-title">Relatórios</h1>
          <p className="page-description">Exporte relatórios de notas fiscais</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa</Label>
                <Select value={companyId} onValueChange={setCompanyId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="authorized">Autorizada</SelectItem>
                    <SelectItem value="rejected">Rejeitada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                    <SelectItem value="draft">Rascunho</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data início</Label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Data fim</Label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={exportCSV}>
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
