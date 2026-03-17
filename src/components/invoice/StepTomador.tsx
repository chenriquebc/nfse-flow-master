import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { UserRound, Search, Loader2 } from "lucide-react";
import { fetchCnpj } from "@/lib/api/brasilapi";
import { fetchCep } from "@/lib/api/brasilapi";
import { toast } from "sonner";

interface StepTomadorProps {
  form: {
    taker_document: string;
    taker_name: string;
    taker_email: string;
    taker_phone: string;
    taker_address_street: string;
    taker_address_number: string;
    taker_address_city: string;
    taker_address_city_code: string;
    taker_address_state: string;
    taker_address_zip: string;
    intermediary_type: string;
    intermediary_document: string;
    intermediary_name: string;
    intermediary_city: string;
    intermediary_city_code: string;
    intermediary_state: string;
  };
  set: (key: string, value: string | boolean) => void;
}

export default function StepTomador({ form, set }: StepTomadorProps) {
  const [searching, setSearching] = useState(false);
  const [searchingCep, setSearchingCep] = useState(false);

  const handleSearchDoc = async () => {
    const doc = form.taker_document.replace(/\D/g, "");
    if (doc.length !== 14) {
      toast.error("Informe um CNPJ válido (14 dígitos) para buscar");
      return;
    }
    setSearching(true);
    try {
      const data = await fetchCnpj(doc);
      set("taker_name", data.razao_social || "");
      set("taker_email", data.email || "");
      set("taker_phone", data.telefone || "");
      set("taker_address_street", data.logradouro || "");
      set("taker_address_number", data.numero || "");
      set("taker_address_city", data.municipio || "");
      set("taker_address_state", data.uf || "");
      set("taker_address_zip", data.cep || "");
      set("taker_address_city_code", String(data.codigo_municipio || ""));
      toast.success("Dados do tomador preenchidos!");
    } catch {
      toast.error("Não foi possível buscar o CNPJ");
    } finally {
      setSearching(false);
    }
  };

  const handleSearchCep = async () => {
    const cep = form.taker_address_zip.replace(/\D/g, "");
    if (cep.length !== 8) { toast.error("CEP inválido"); return; }
    setSearchingCep(true);
    try {
      const data = await fetchCep(cep);
      set("taker_address_street", data.street || "");
      set("taker_address_city", data.city || "");
      set("taker_address_state", data.state || "");
      toast.success("Endereço preenchido!");
    } catch {
      toast.error("CEP não encontrado");
    } finally {
      setSearchingCep(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <UserRound className="h-10 w-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Dados do Tomador</h2>
        <p className="text-sm text-muted-foreground">Informe os dados de quem está contratando o serviço</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Document + search */}
          <div className="space-y-2">
            <Label>CPF/CNPJ *</Label>
            <div className="flex gap-2">
              <Input
                className="h-12 flex-1"
                value={form.taker_document}
                onChange={(e) => set("taker_document", e.target.value)}
                placeholder="00.000.000/0000-00"
              />
              <Button type="button" variant="outline" className="h-12 px-3" onClick={handleSearchDoc} disabled={searching}>
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Nome / Razão Social *</Label>
            <Input className="h-12" value={form.taker_name} onChange={(e) => set("taker_name", e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.taker_email} onChange={(e) => set("taker_email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={form.taker_phone} onChange={(e) => set("taker_phone", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Endereço</h3>

          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="flex gap-2">
              <Input
                className="h-12 flex-1"
                value={form.taker_address_zip}
                onChange={(e) => set("taker_address_zip", e.target.value)}
                placeholder="00000-000"
              />
              <Button type="button" variant="outline" className="h-12 px-3" onClick={handleSearchCep} disabled={searchingCep}>
                {searchingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>Logradouro</Label>
              <Input value={form.taker_address_street} onChange={(e) => set("taker_address_street", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Número</Label>
              <Input value={form.taker_address_number} onChange={(e) => set("taker_address_number", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={form.taker_address_city} onChange={(e) => set("taker_address_city", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input value={form.taker_address_state} onChange={(e) => set("taker_address_state", e.target.value)} maxLength={2} />
            </div>
            <div className="space-y-2">
              <Label>Cód. Município</Label>
              <Input value={form.taker_address_city_code} onChange={(e) => set("taker_address_city_code", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intermediário do Serviço */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Intermediário do Serviço</h3>

          <div className="space-y-3">
            <Label>Onde está localizado o estabelecimento/domicílio? *</Label>
            <RadioGroup
              value={form.intermediary_type}
              onValueChange={(v) => set("intermediary_type", v)}
              className="flex flex-col gap-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="int-none" />
                <Label htmlFor="int-none" className="font-normal cursor-pointer">Intermediário não informado</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="brasil" id="int-brasil" />
                <Label htmlFor="int-brasil" className="font-normal cursor-pointer">Brasil</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="exterior" id="int-exterior" />
                <Label htmlFor="int-exterior" className="font-normal cursor-pointer">Exterior</Label>
              </div>
            </RadioGroup>
          </div>

          {form.intermediary_type !== "none" && (
            <div className="space-y-4 pt-2 animate-fade-in">
              <div className="space-y-2">
                <Label>CPF/CNPJ do Intermediário *</Label>
                <Input className="h-12" value={form.intermediary_document} onChange={(e) => set("intermediary_document", e.target.value)} placeholder="Documento do intermediário" />
              </div>
              <div className="space-y-2">
                <Label>Nome / Razão Social *</Label>
                <Input className="h-12" value={form.intermediary_name} onChange={(e) => set("intermediary_name", e.target.value)} />
              </div>
              {form.intermediary_type === "brasil" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={form.intermediary_city} onChange={(e) => set("intermediary_city", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>UF</Label>
                    <Input value={form.intermediary_state} onChange={(e) => set("intermediary_state", e.target.value)} maxLength={2} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cód. Município</Label>
                    <Input value={form.intermediary_city_code} onChange={(e) => set("intermediary_city_code", e.target.value)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
