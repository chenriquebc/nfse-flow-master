import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Search, Loader2, Save, Mail } from "lucide-react";
import { fetchCnpj, fetchCep, resolveIbgeCode } from "@/lib/api/brasilapi";
import { toast } from "sonner";

const EMPTY_FORM = {
  document: "",
  name: "",
  email: "",
  phone: "",
  address_street: "",
  address_number: "",
  address_complement: "",
  address_neighborhood: "",
  address_city: "",
  address_city_code: "",
  address_state: "",
  address_zip: "",
  auto_send_email: false,
};

export default function TakerForm() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { tenant } = useTenant();
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [searchingDoc, setSearchingDoc] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    if (!isEdit || !tenant) return;
    supabase
      .from("service_takers")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setForm({
            document: data.document || "",
            name: data.name || "",
            email: data.email || "",
            phone: data.phone || "",
            address_street: data.address_street || "",
            address_number: data.address_number || "",
            address_complement: data.address_complement || "",
            address_neighborhood: data.address_neighborhood || "",
            address_city: data.address_city || "",
            address_city_code: data.address_city_code || "",
            address_state: data.address_state || "",
            address_zip: data.address_zip || "",
            auto_send_email: data.auto_send_email ?? false,
          });
        }
        setLoading(false);
      });
  }, [id, tenant]);

  const handleSearchDoc = async () => {
    const doc = form.document.replace(/\D/g, "");
    if (doc.length !== 14) {
      toast.error("Informe um CNPJ válido (14 dígitos) para buscar");
      return;
    }
    setSearchingDoc(true);
    try {
      const data = await fetchCnpj(doc);
      set("name", data.razao_social || "");
      set("email", data.email || "");
      set("phone", data.telefone || "");
      set("address_street", data.logradouro || "");
      set("address_number", data.numero || "");
      set("address_complement", data.complemento || "");
      set("address_neighborhood", data.bairro || "");
      set("address_city", data.municipio || "");
      set("address_state", data.uf || "");
      set("address_zip", data.cep || "");
      const ibgeCode = await resolveIbgeCode(data.municipio, data.uf);
      set("address_city_code", ibgeCode || String(data.codigo_municipio || ""));
      toast.success("Dados preenchidos via CNPJ!");
    } catch {
      toast.error("Não foi possível buscar o CNPJ");
    } finally {
      setSearchingDoc(false);
    }
  };

  const handleSearchCep = async () => {
    const cep = form.address_zip.replace(/\D/g, "");
    if (cep.length !== 8) {
      toast.error("CEP inválido");
      return;
    }
    setSearchingCep(true);
    try {
      const data = await fetchCep(cep);
      set("address_street", data.street || "");
      set("address_city", data.city || "");
      set("address_state", data.state || "");
      set("address_neighborhood", data.neighborhood || "");
      toast.success("Endereço preenchido via CEP!");
    } catch {
      toast.error("CEP não encontrado");
    } finally {
      setSearchingCep(false);
    }
  };

  const handleSave = async () => {
    if (!tenant) return;
    if (!form.document.trim()) {
      toast.error("CPF/CNPJ é obrigatório");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    setSaving(true);
    const payload = {
      tenant_id: tenant.id,
      document: form.document.trim(),
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address_street: form.address_street || null,
      address_number: form.address_number || null,
      address_complement: form.address_complement || null,
      address_neighborhood: form.address_neighborhood || null,
      address_city: form.address_city || null,
      address_city_code: form.address_city_code || null,
      address_state: form.address_state || null,
      address_zip: form.address_zip || null,
      auto_send_email: form.auto_send_email,
    };

    let error;
    if (isEdit) {
      ({ error } = await supabase
        .from("service_takers")
        .update(payload)
        .eq("id", id));
    } else {
      ({ error } = await supabase
        .from("service_takers")
        .insert(payload));
    }

    if (error) {
      if (error.code === "23505") {
        toast.error("Já existe um tomador com este CPF/CNPJ cadastrado");
      } else {
        toast.error("Erro ao salvar tomador", { description: error.message });
      }
    } else {
      toast.success(isEdit ? "Tomador atualizado!" : "Tomador cadastrado!");
      navigate("/takers");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="flex items-center gap-3 page-header">
          <Button variant="ghost" size="icon" onClick={() => navigate("/takers")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="page-title">{isEdit ? "Editar Tomador" : "Novo Tomador"}</h1>
            <p className="page-description">
              {isEdit ? "Atualize os dados do tomador" : "Cadastre um novo tomador de serviço"}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Dados do Tomador */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados do Tomador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>CPF/CNPJ *</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={form.document}
                    onChange={(e) => set("document", e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                  <Button type="button" variant="outline" onClick={handleSearchDoc} disabled={searchingDoc}>
                    {searchingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome / Razão Social *</Label>
                <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={form.address_zip}
                    onChange={(e) => set("address_zip", e.target.value)}
                    placeholder="00000-000"
                  />
                  <Button type="button" variant="outline" onClick={handleSearchCep} disabled={searchingCep}>
                    {searchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Logradouro</Label>
                  <Input value={form.address_street} onChange={(e) => set("address_street", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Número</Label>
                  <Input value={form.address_number} onChange={(e) => set("address_number", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Complemento</Label>
                  <Input value={form.address_complement} onChange={(e) => set("address_complement", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Bairro</Label>
                  <Input value={form.address_neighborhood} onChange={(e) => set("address_neighborhood", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input value={form.address_city} onChange={(e) => set("address_city", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Input value={form.address_state} onChange={(e) => set("address_state", e.target.value)} maxLength={2} />
                </div>
                <div className="space-y-2">
                  <Label>Cód. Município</Label>
                  <Input value={form.address_city_code} onChange={(e) => set("address_city_code", e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Envio automático */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Envio Automático de E-mail
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Enviar XML/PDF automaticamente ao emitir nota</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ao emitir uma NFS-e contra este tomador, o XML e PDF serão enviados automaticamente por e-mail
                  </p>
                </div>
                <Switch
                  checked={form.auto_send_email}
                  onCheckedChange={(v) => set("auto_send_email", v)}
                />
              </div>
              {form.auto_send_email && !form.email && (
                <p className="text-xs text-destructive mt-2">
                  ⚠ Para o envio automático funcionar, preencha o e-mail do tomador acima.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-8">
            <Button variant="outline" onClick={() => navigate("/takers")}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              {isEdit ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
