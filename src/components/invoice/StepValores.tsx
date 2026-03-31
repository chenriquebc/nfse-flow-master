import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMemo } from "react";

const ISSQN_TAXATION_OPTIONS = [
  { value: "tributavel", label: "Operação Tributável" },
  { value: "imune", label: "Imunidade" },
  { value: "isenta", label: "Isenção" },
  { value: "exportacao", label: "Exportação de Serviço" },
  { value: "nao_incidencia", label: "Não Incidência" },
];

const SPECIAL_TAX_REGIME_OPTIONS_FULL = [
  { value: "nenhum", label: "Nenhum" },
  { value: "microempresa_municipal", label: "Microempresa Municipal" },
  { value: "estimativa", label: "Estimativa" },
  { value: "sociedade_profissionais", label: "Sociedade de Profissionais" },
  { value: "cooperativa", label: "Cooperativa" },
  { value: "mei", label: "Microempreendedor Individual (MEI)" },
  { value: "me_epp", label: "Microempresa ou Empresa de Pequeno Porte (ME/EPP)" },
];

const SPECIAL_TAX_REGIME_SIMPLES = [
  { value: "nenhum", label: "Nenhum" },
  { value: "mei", label: "Microempreendedor Individual (MEI)" },
  { value: "me_epp", label: "Microempresa ou Empresa de Pequeno Porte (ME/EPP)" },
];

const PIS_COFINS_SITUATIONS = [
  { value: "00", label: "00 - Nenhum" },
  { value: "01", label: "01 - Operação Tributável com Alíquota Básica" },
  { value: "02", label: "02 - Operação Tributável com Alíquota Diferenciada" },
  { value: "03", label: "03 - Operação Tributável com Alíquota por Unidade de Medida" },
  { value: "04", label: "04 - Operação Tributável Monofásica - Revenda a Alíquota Zero" },
  { value: "05", label: "05 - Operação Tributável por Substituição Tributária" },
  { value: "06", label: "06 - Operação Tributável a Alíquota Zero" },
  { value: "07", label: "07 - Operação Isenta da Contribuição" },
  { value: "08", label: "08 - Operação sem Incidência da Contribuição" },
  { value: "09", label: "09 - Operação com Suspensão da Contribuição" },
  { value: "99", label: "99 - Outras Operações" },
];

const PIS_COFINS_RETENTION_TYPES = [
  { value: "nao_retido", label: "PIS/COFINS/CSLL Não Retidos" },
  { value: "retido", label: "PIS/COFINS/CSLL Retidos" },
  { value: "pis_cofins_retido_csll_nao", label: "PIS/COFINS Retidos, CSLL Não Retido" },
  { value: "pis_retido_cofins_csll_nao", label: "PIS Retido, COFINS/CSLL Não Retido" },
  { value: "cofins_retido_pis_csll_nao", label: "COFINS Retido, PIS/CSLL Não Retido" },
];

interface StepValoresProps {
  form: {
    service_value: string;
    intermediary_value: string;
    unconditional_discount: string;
    conditional_discount: string;
    deduction_value: string;
    discount_value: string;
    iss_rate: string;
    iss_retained: boolean;
    issqn_taxation: string;
    special_tax_regime: string;
    issqn_suspended: boolean;
    issqn_retained_by_taker: boolean;
    municipal_benefit: boolean;
    pis_cofins_situation: string;
    pis_cofins_csll_retention_type: string;
    irrf_value: string;
    social_contributions_retained: string;
    social_security_retained: string;
    approx_tax_mode: string;
    simples_nacional_rate: string;
    pis_value: string;
    cofins_value: string;
    inss_value: string;
    ir_value: string;
    csll_value: string;
    notes: string;
    intermediary_type: string;
    issqn_exemption: boolean;
    tax_assessment_regime: string;
  };
  set: (key: string, value: string | boolean) => void;
  baseValue: number;
  issValue: number;
  totalDeductions: number;
  netValue: number;
  formatCurrency: (v: number) => string;
}

export default function StepValores({ form, set, baseValue, issValue, totalDeductions, netValue, formatCurrency }: StepValoresProps) {
  const hasIntermediary = form.intermediary_type !== "none";
  
  // When issqn_exemption is false ("Não"), lock ISSQN taxation to "tributavel"
  const issqnTaxationLocked = !form.issqn_exemption;

  // Special tax regime options depend on tax_assessment_regime
  const specialTaxRegimeOptions = useMemo(() => {
    // Regime 1 = full simples, regime 2 = simples + ISSQN fora
    if (form.tax_assessment_regime === "1" || form.tax_assessment_regime === "2") {
      return SPECIAL_TAX_REGIME_SIMPLES;
    }
    return SPECIAL_TAX_REGIME_OPTIONS_FULL;
  }, [form.tax_assessment_regime]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <Calculator className="h-10 w-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Valores e Tributos</h2>
        <p className="text-sm text-muted-foreground">Informe os valores do serviço e as tributações</p>
      </div>

      {/* VALORES DO SERVIÇO PRESTADO */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Valores do Serviço Prestado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor do serviço prestado *</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="number" step="0.01" min="0" className="h-10 rounded-l-none text-lg font-semibold" value={form.service_value} onChange={(e) => set("service_value", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">
                Valor recebido pelo intermediário
                {!hasIntermediary && <span className="text-xs ml-1">(ative o intermediário no passo Tomador)</span>}
              </Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className="h-10 rounded-l-none"
                  value={form.intermediary_value}
                  onChange={(e) => set("intermediary_value", e.target.value)}
                  disabled={!hasIntermediary}
                />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Desconto incondicionado</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="number" step="0.01" min="0" className="h-10 rounded-l-none" value={form.unconditional_discount} onChange={(e) => set("unconditional_discount", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Desconto condicionado</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="number" step="0.01" min="0" className="h-10 rounded-l-none" value={form.conditional_discount} onChange={(e) => set("conditional_discount", e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info banner - only show for non-Simples Nacional */}
      {form.tax_assessment_regime !== "1" && form.tax_assessment_regime !== "2" && (
        <Alert className="border-primary/20 bg-primary/5">
          <Info className="h-4 w-4 text-primary" />
          <AlertDescription className="text-sm text-muted-foreground">
            As informações de Tributação Municipal abaixo, exceto retenção, não podem ser alteradas pois o tributo (ISSQN) será apurado pelo regime tributário selecionado.
          </AlertDescription>
        </Alert>
      )}

      {/* TRIBUTAÇÃO MUNICIPAL */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Tributação Municipal</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tributação do ISSQN sobre o serviço prestado</Label>
              <Select
                value={issqnTaxationLocked ? "tributavel" : form.issqn_taxation}
                onValueChange={(v) => set("issqn_taxation", v)}
                disabled={issqnTaxationLocked}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ISSQN_TAXATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Regime Especial de Tributação *</Label>
              <Select value={form.special_tax_regime} onValueChange={(v) => set("special_tax_regime", v)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {specialTaxRegimeOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <Label>A exigibilidade do recolhimento do ISSQN devido nesta operação está suspensa? *</Label>
            <RadioGroup value={form.issqn_suspended ? "sim" : "nao"} onValueChange={(v) => set("issqn_suspended", v === "sim")} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="susp-nao" />
                <Label htmlFor="susp-nao" className="font-normal cursor-pointer">Não</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="susp-sim" />
                <Label htmlFor="susp-sim" className="font-normal cursor-pointer">Sim</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Há retenção do ISSQN pelo Tomador ou pelo Intermediário? *</Label>
            <RadioGroup value={form.issqn_retained_by_taker ? "sim" : "nao"} onValueChange={(v) => set("issqn_retained_by_taker", v === "sim")} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="ret-nao" />
                <Label htmlFor="ret-nao" className="font-normal cursor-pointer">Não</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="ret-sim" />
                <Label htmlFor="ret-sim" className="font-normal cursor-pointer">Sim</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-3">
            <Label>Este serviço prestado está amparado por algum benefício municipal? *</Label>
            <RadioGroup value={form.municipal_benefit ? "sim" : "nao"} onValueChange={(v) => set("municipal_benefit", v === "sim")} className="flex gap-6">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="nao" id="ben-nao" />
                <Label htmlFor="ben-nao" className="font-normal cursor-pointer">Não</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sim" id="ben-sim" />
                <Label htmlFor="ben-sim" className="font-normal cursor-pointer">Sim</Label>
              </div>
            </RadioGroup>
          </div>

          {/* ISS calculated fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Alíquota (%)</Label>
              <div className="flex">
                <Input type="number" step="0.01" min="0" max="100" className="h-10 rounded-r-none" value={form.iss_rate} onChange={(e) => set("iss_rate", e.target.value)} />
                <span className="inline-flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm text-muted-foreground">%</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>BC ISSQN</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="number" step="0.01" min="0" className="h-10 rounded-l-none" value={baseValue.toFixed(2)} onChange={(e) => set("deduction_value", String((parseFloat(form.service_value) || 0) - (parseFloat(e.target.value) || 0)))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valor ISSQN</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="text" readOnly className="h-10 rounded-l-none bg-muted/50" value={issValue.toFixed(2)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TRIBUTAÇÃO FEDERAL */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Tributação Federal</h3>

          <div className="space-y-2">
            <Label>Situação Tributária do PIS/COFINS *</Label>
            <Select value={form.pis_cofins_situation} onValueChange={(v) => set("pis_cofins_situation", v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PIS_COFINS_SITUATIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de retenção do PIS/COFINS/CSLL *</Label>
            <Select value={form.pis_cofins_csll_retention_type} onValueChange={(v) => set("pis_cofins_csll_retention_type", v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {PIS_COFINS_RETENTION_TYPES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-sm min-h-[2.5rem] flex items-end">IRRF</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="number" step="0.01" min="0" className="h-10 rounded-l-none" value={form.irrf_value} onChange={(e) => set("irrf_value", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm min-h-[2.5rem] flex items-end">Contribuições Sociais - Retidas</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="number" step="0.01" min="0" className="h-10 rounded-l-none" value={form.social_contributions_retained} onChange={(e) => set("social_contributions_retained", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm min-h-[2.5rem] flex items-end">Contribuição Previdenciária - Retida</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 bg-muted border border-r-0 border-input rounded-l-md text-sm text-muted-foreground">R$</span>
                <Input type="number" step="0.01" min="0" className="h-10 rounded-l-none" value={form.social_security_retained} onChange={(e) => set("social_security_retained", e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* VALOR APROXIMADO DOS TRIBUTOS */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">Valor Aproximado dos Tributos</h3>

          <RadioGroup value={form.approx_tax_mode} onValueChange={(v) => set("approx_tax_mode", v)} className="flex flex-col gap-2">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="monetario" id="tax-monetario" />
              <Label htmlFor="tax-monetario" className="font-normal cursor-pointer">Preencher os valores monetários em cada NFS-e emitida</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentual" id="tax-percentual" />
              <Label htmlFor="tax-percentual" className="font-normal cursor-pointer">Configurar os valores percentuais correspondentes</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="simples_nacional" id="tax-simples" />
              <Label htmlFor="tax-simples" className="font-normal cursor-pointer">Informar alíquota do Simples Nacional</Label>
            </div>
          </RadioGroup>

          {form.approx_tax_mode === "simples_nacional" && (
            <div className="space-y-2 max-w-xs animate-fade-in">
              <Label>Alíquota no Simples Nacional *</Label>
              <div className="flex">
                <Input type="number" step="0.01" min="0" max="100" className="h-10 rounded-r-none" value={form.simples_nacional_rate} onChange={(e) => set("simples_nacional_rate", e.target.value)} />
                <span className="inline-flex items-center px-3 bg-muted border border-l-0 border-input rounded-r-md text-sm text-muted-foreground">%</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Base de Cálculo</p>
              <p className="font-semibold text-foreground text-base">{formatCurrency(baseValue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ISS ({form.iss_rate}%)</p>
              <p className="font-semibold text-foreground text-base">{formatCurrency(issValue)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Retenções</p>
              <p className="font-semibold text-foreground text-base">{formatCurrency(totalDeductions)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Valor Líquido</p>
              <p className="font-bold text-primary text-xl">{formatCurrency(netValue)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="pt-6 space-y-2">
          <Label>Observações</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Observações adicionais..." />
        </CardContent>
      </Card>
    </div>
  );
}
