import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Search, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { fetchCnpj, fetchCep } from "@/lib/api/brasilapi";
import { CnaeCombobox, CnaeMultiSelect } from "@/components/company/CnaeCombobox";

const emptyForm = {
  legal_name: "",
  trade_name: "",
  document: "",
  state_registration: "",
  municipal_registration: "",
  tax_regime: 1,
  cnae_code: "",
  secondary_cnae_codes: [] as string[],
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_city_code: "",
  address_state: "",
  address_zip: "",
  phone: "",
  email: "",
  environment: 2,
};

export default function CompanyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const isEdit = !!id;

  useEffect(() => {
    if (isEdit && tenant) {
      supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setForm({
              legal_name: data.legal_name || "",
              trade_name: data.trade_name || "",
              document: data.document || "",
              state_registration: data.state_registration || "",
              municipal_registration: data.municipal_registration || "",
              tax_regime: data.tax_regime || 1,
              cnae_code: data.cnae_code || "",
              secondary_cnae_codes: (data as any).secondary_cnae_codes || [],
              address_street: data.address_street || "",
              address_number: data.address_number || "",
              address_complement: data.address_complement || "",
              address_neighborhood: data.address_neighborhood || "",
              address_city: data.address_city || "",
              address_city_code: data.address_city_code || "",
              address_state: data.address_state || "",
              address_zip: data.address_zip || "",
              phone: data.phone || "",
              email: data.email || "",
              environment: data.environment || 2,
            });
          }
        });
    }
  }, [id, tenant]);

  const set = (key: string, value: string | number | string[]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleCnpjLookup = async () => {
    if (!form.document.trim()) {
      toast.error("Digite o CNPJ antes de buscar");
      return;
    }
    setCnpjLoading(true);
    try {
      const data = await fetchCnpj(form.document);
      setForm((f) => ({
        ...f,
        legal_name: data.razao_social || f.legal_name,
        trade_name: data.nome_fantasia || f.trade_name,
        address_street: data.logradouro || f.address_street,
        address_number: data.numero || f.address_number,
        address_complement: data.complemento || f.address_complement,
        address_neighborhood: data.bairro || f.address_neighborhood,
        address_city: data.municipio || f.address_city,
        address_city_code: data.codigo_municipio ? String(data.codigo_municipio) : f.address_city_code,
        address_state: data.uf || f.address_state,
        address_zip: data.cep ? data.cep.replace(/\D/g, "") : f.address_zip,
        email: data.email || f.email,
        phone: data.telefone || f.phone,
        cnae_code: data.cnae_fiscal ? String(data.cnae_fiscal) : f.cnae_code,
        secondary_cnae_codes: data.cnaes_secundarios?.length
          ? data.cnaes_secundarios.map((c) => String(c.codigo))
          : f.secondary_cnae_codes,
      }));
      toast.success("Dados importados da Receita Federal!");
    } catch (err: any) {
      toast.error("Erro ao buscar CNPJ", { description: err.message });
    } finally {
      setCnpjLoading(false);
    }
  };

  const handleCepLookup = async () => {
    if (!form.address_zip.trim()) {
      toast.error("Digite o CEP antes de buscar");
      return;
    }
    setCepLoading(true);
    try {
      const data = await fetchCep(form.address_zip);
      setForm((f) => ({
        ...f,
        address_street: data.street || f.address_street,
        address_neighborhood: data.neighborhood || f.address_neighborhood,
        address_city: data.city || f.address_city,
        address_state: data.state || f.address_state,
      }));
      toast.success("Endereço preenchido via CEP!");
    } catch (err: any) {
      toast.error("Erro ao buscar CEP", { description: err.message });
    } finally {
      setCepLoading(false);
    }
  };

  const handleCertificateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast.info("Importação via certificado digital será implementada em breve. Use a busca por CNPJ.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!form.legal_name.trim() || !form.document.trim()) {
      toast.error("Razão Social e CNPJ são obrigatórios");
      return;
    }
    setLoading(true);

    const payload = { ...form, tenant_id: tenant.id } as any;

    if (isEdit) {
      const { error } = await supabase.from("companies").update(payload).eq("id", id);
      if (error) toast.error("Erro ao atualizar", { description: error.message });
      else {
        toast.success("Empresa atualizada!");
        navigate("/companies");
      }
    } else {
      const { error } = await supabase.from("companies").insert(payload);
      if (error) toast.error("Erro ao criar", { description: error.message });
      else {
        toast.success("Empresa criada!");
        navigate("/companies");
      }
    }
    setLoading(false);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-3xl">
        <div className="page-header">
          <Button variant="ghost" size="sm" onClick={() => navigate("/companies")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="page-title">{isEdit ? "Editar Empresa" : "Nova Empresa"}</h1>
          <p className="page-description">
            {isEdit ? "Atualize os dados da empresa" : "Cadastre uma nova empresa cliente"}
          </p>
        </div>

        {/* Import Options */}
        {!isEdit && (
          <Card className="mb-6 border-dashed">
            <CardHeader>
              <CardTitle className="text-base">Importar Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Preencha automaticamente os dados da empresa buscando pelo CNPJ na Receita Federal ou importando via certificado digital.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex gap-2 flex-1">
                  <Input
                    placeholder="Digite o CNPJ..."
                    value={form.document}
                    onChange={(e) => set("document", e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleCnpjLookup} disabled={cnpjLoading}>
                    {cnpjLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Buscar RFB</span>
                  </Button>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept=".pfx,.p12"
                    onChange={handleCertificateImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Button type="button" variant="outline" className="w-full pointer-events-none">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Certificado
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Dados Principais</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Razão Social *</Label>
                <Input value={form.legal_name} onChange={(e) => set("legal_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Nome Fantasia</Label>
                <Input value={form.trade_name} onChange={(e) => set("trade_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.document}
                    onChange={(e) => set("document", e.target.value)}
                    placeholder="00.000.000/0000-00"
                    required
                    className="flex-1"
                  />
                  {isEdit && (
                    <Button type="button" variant="ghost" size="icon" onClick={handleCnpjLookup} disabled={cnpjLoading} title="Buscar dados na RFB">
                      {cnpjLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Inscrição Estadual</Label>
                <Input value={form.state_registration} onChange={(e) => set("state_registration", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Inscrição Municipal</Label>
                <Input value={form.municipal_registration} onChange={(e) => set("municipal_registration", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Regime Tributário</Label>
                <Select value={String(form.tax_regime)} onValueChange={(v) => set("tax_regime", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Simples Nacional</SelectItem>
                    <SelectItem value="2">SN - Excesso</SelectItem>
                    <SelectItem value="3">Regime Normal</SelectItem>
                    <SelectItem value="4">MEI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CNAE Principal</Label>
                <CnaeCombobox value={form.cnae_code} onChange={(v) => set("cnae_code", v)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>CNAEs Secundários</Label>
                <CnaeMultiSelect values={form.secondary_cnae_codes} onChange={(v) => set("secondary_cnae_codes", v)} />
              </div>
              <div className="space-y-2">
                <Label>Ambiente</Label>
                <Select value={String(form.environment)} onValueChange={(v) => set("environment", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Produção</SelectItem>
                    <SelectItem value="2">Homologação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.address_zip}
                    onChange={(e) => set("address_zip", e.target.value)}
                    placeholder="00000-000"
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={handleCepLookup} disabled={cepLoading} title="Buscar endereço pelo CEP">
                    {cepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input value={form.address_state} onChange={(e) => set("address_state", e.target.value)} maxLength={2} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro</Label>
                <Input value={form.address_street} onChange={(e) => set("address_street", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Número</Label>
                <Input value={form.address_number} onChange={(e) => set("address_number", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Complemento</Label>
                <Input value={form.address_complement} onChange={(e) => set("address_complement", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Input value={form.address_neighborhood} onChange={(e) => set("address_neighborhood", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input value={form.address_city} onChange={(e) => set("address_city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Código IBGE</Label>
                <Input value={form.address_city_code} onChange={(e) => set("address_city_code", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : isEdit ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
