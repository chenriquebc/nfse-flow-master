import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";

interface Company {
  id: string;
  legal_name: string;
}

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    company_id: "",
    competence_date: new Date().toISOString().split("T")[0],
    taker_document: "",
    taker_name: "",
    taker_email: "",
    taker_phone: "",
    taker_address_street: "",
    taker_address_number: "",
    taker_address_city: "",
    taker_address_city_code: "",
    taker_address_state: "",
    taker_address_zip: "",
    service_description: "",
    tax_code: "",
    nbs_code: "",
    cnae_code: "",
    service_value: "",
    deduction_value: "0",
    discount_value: "0",
    iss_rate: "5",
    iss_retained: false,
    pis_value: "0",
    cofins_value: "0",
    inss_value: "0",
    ir_value: "0",
    csll_value: "0",
    notes: "",
  });

  useEffect(() => {
    if (!tenant) return;
    supabase
      .from("companies")
      .select("id, legal_name")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("legal_name")
      .then(({ data }) => setCompanies((data as Company[]) || []));
  }, [tenant]);

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const serviceValue = parseFloat(form.service_value) || 0;
  const deductionValue = parseFloat(form.deduction_value) || 0;
  const discountValue = parseFloat(form.discount_value) || 0;
  const issRate = parseFloat(form.iss_rate) || 0;
  const baseValue = serviceValue - deductionValue;
  const issValue = baseValue * (issRate / 100);
  const totalDeductions =
    (parseFloat(form.pis_value) || 0) +
    (parseFloat(form.cofins_value) || 0) +
    (parseFloat(form.inss_value) || 0) +
    (parseFloat(form.ir_value) || 0) +
    (parseFloat(form.csll_value) || 0) +
    (form.iss_retained ? issValue : 0);
  const netValue = serviceValue - discountValue - totalDeductions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant || !user) return;

    if (!form.company_id) { toast.error("Selecione uma empresa"); return; }
    if (!form.taker_document.trim()) { toast.error("Informe o CPF/CNPJ do tomador"); return; }
    if (!form.taker_name.trim()) { toast.error("Informe o nome do tomador"); return; }
    if (!form.service_description.trim()) { toast.error("Descreva o serviço"); return; }
    if (!form.tax_code.trim()) { toast.error("Informe o código de tributação"); return; }
    if (serviceValue <= 0) { toast.error("Informe o valor do serviço"); return; }

    setLoading(true);

    const payload = {
      tenant_id: tenant.id,
      company_id: form.company_id,
      competence_date: form.competence_date,
      taker_document: form.taker_document,
      taker_name: form.taker_name,
      taker_email: form.taker_email || null,
      taker_phone: form.taker_phone || null,
      taker_address_street: form.taker_address_street || null,
      taker_address_number: form.taker_address_number || null,
      taker_address_city: form.taker_address_city || null,
      taker_address_city_code: form.taker_address_city_code || null,
      taker_address_state: form.taker_address_state || null,
      taker_address_zip: form.taker_address_zip || null,
      service_description: form.service_description,
      tax_code: form.tax_code,
      nbs_code: form.nbs_code || null,
      cnae_code: form.cnae_code || null,
      service_value: serviceValue,
      deduction_value: deductionValue,
      discount_value: discountValue,
      base_value: baseValue,
      iss_rate: issRate / 100,
      iss_value: issValue,
      iss_retained: form.iss_retained,
      pis_value: parseFloat(form.pis_value) || 0,
      cofins_value: parseFloat(form.cofins_value) || 0,
      inss_value: parseFloat(form.inss_value) || 0,
      ir_value: parseFloat(form.ir_value) || 0,
      csll_value: parseFloat(form.csll_value) || 0,
      net_value: netValue,
      notes: form.notes || null,
      status: "draft" as const,
      created_by: user.id,
    };

    const { error } = await supabase.from("nfse_invoices").insert(payload);

    if (error) {
      toast.error("Erro ao criar nota", { description: error.message });
    } else {
      toast.success("Nota fiscal criada como rascunho!");
      navigate("/invoices");
    }
    setLoading(false);
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-4xl">
        <div className="page-header">
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="page-title">Nova Nota Fiscal de Serviço</h1>
          <p className="page-description">Preencha os dados para emissão da NFS-e</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Empresa e Competência */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Dados da Nota</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Empresa Emitente *</Label>
                <Select value={form.company_id} onValueChange={(v) => set("company_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Competência *</Label>
                <Input type="date" value={form.competence_date} onChange={(e) => set("competence_date", e.target.value)} required />
              </div>
            </CardContent>
          </Card>

          {/* Tomador */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Dados do Tomador</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CPF/CNPJ *</Label>
                <Input value={form.taker_document} onChange={(e) => set("taker_document", e.target.value)} placeholder="000.000.000-00" required />
              </div>
              <div className="space-y-2">
                <Label>Nome/Razão Social *</Label>
                <Input value={form.taker_name} onChange={(e) => set("taker_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.taker_email} onChange={(e) => set("taker_email", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.taker_phone} onChange={(e) => set("taker_phone", e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Endereço</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="col-span-2" placeholder="Logradouro" value={form.taker_address_street} onChange={(e) => set("taker_address_street", e.target.value)} />
                  <Input placeholder="Número" value={form.taker_address_number} onChange={(e) => set("taker_address_number", e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.taker_address_city} onChange={(e) => set("taker_address_city", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={form.taker_address_state} onChange={(e) => set("taker_address_state", e.target.value)} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>CEP</Label>
                  <Input value={form.taker_address_zip} onChange={(e) => set("taker_address_zip", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Serviço */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Serviço</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição do Serviço *</Label>
                <Textarea value={form.service_description} onChange={(e) => set("service_description", e.target.value)} rows={3} required />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Código de Tributação *</Label>
                  <Input value={form.tax_code} onChange={(e) => set("tax_code", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>NBS</Label>
                  <Input value={form.nbs_code} onChange={(e) => set("nbs_code", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CNAE</Label>
                  <Input value={form.cnae_code} onChange={(e) => set("cnae_code", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valores */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Valores</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Valor do Serviço (R$) *</Label>
                  <Input type="number" step="0.01" min="0" value={form.service_value} onChange={(e) => set("service_value", e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Deduções (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.deduction_value} onChange={(e) => set("deduction_value", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Desconto (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Alíquota ISS (%)</Label>
                  <Input type="number" step="0.01" min="0" max="100" value={form.iss_rate} onChange={(e) => set("iss_rate", e.target.value)} />
                </div>
                <div className="flex items-center gap-3 pt-6">
                  <Switch checked={form.iss_retained} onCheckedChange={(v) => set("iss_retained", v)} />
                  <Label>ISS Retido</Label>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>PIS (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.pis_value} onChange={(e) => set("pis_value", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>COFINS (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.cofins_value} onChange={(e) => set("cofins_value", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>INSS (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.inss_value} onChange={(e) => set("inss_value", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>IR (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.ir_value} onChange={(e) => set("ir_value", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CSLL (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={form.csll_value} onChange={(e) => set("csll_value", e.target.value)} />
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-lg bg-muted p-4 mt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Base de Cálculo</p>
                    <p className="font-semibold text-foreground">{formatCurrency(baseValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">ISS ({form.iss_rate}%)</p>
                    <p className="font-semibold text-foreground">{formatCurrency(issValue)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Retenções</p>
                    <p className="font-semibold text-foreground">{formatCurrency(totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor Líquido</p>
                    <p className="font-bold text-lg text-foreground">{formatCurrency(netValue)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Observações */}
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Observações</CardTitle></CardHeader>
            <CardContent>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Observações adicionais..." />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/invoices")}>Cancelar</Button>
            <Button type="submit" disabled={loading}>
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Rascunho"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
