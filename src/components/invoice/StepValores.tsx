import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Calculator } from "lucide-react";

interface StepValoresProps {
  form: {
    service_value: string;
    deduction_value: string;
    discount_value: string;
    iss_rate: string;
    iss_retained: boolean;
    pis_value: string;
    cofins_value: string;
    inss_value: string;
    ir_value: string;
    csll_value: string;
    notes: string;
  };
  set: (key: string, value: string | boolean) => void;
  baseValue: number;
  issValue: number;
  totalDeductions: number;
  netValue: number;
  formatCurrency: (v: number) => string;
}

export default function StepValores({ form, set, baseValue, issValue, totalDeductions, netValue, formatCurrency }: StepValoresProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <Calculator className="h-10 w-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Valores e Tributos</h2>
        <p className="text-sm text-muted-foreground">Informe os valores do serviço e as retenções</p>
      </div>

      {/* Main values */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Valores Principais</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Valor do Serviço (R$) *</Label>
              <Input type="number" step="0.01" min="0" className="h-12 text-lg font-semibold" value={form.service_value} onChange={(e) => set("service_value", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Deduções (R$)</Label>
              <Input type="number" step="0.01" min="0" className="h-12" value={form.deduction_value} onChange={(e) => set("deduction_value", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Desconto (R$)</Label>
              <Input type="number" step="0.01" min="0" className="h-12" value={form.discount_value} onChange={(e) => set("discount_value", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ISS */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">ISS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label>Alíquota ISS (%)</Label>
              <Input type="number" step="0.01" min="0" max="100" className="h-12" value={form.iss_rate} onChange={(e) => set("iss_rate", e.target.value)} />
            </div>
            <div className="flex items-center gap-3 h-12">
              <Switch checked={form.iss_retained} onCheckedChange={(v) => set("iss_retained", v)} />
              <Label className="cursor-pointer">ISS Retido na Fonte</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Federal taxes */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Retenções Federais</h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "PIS", key: "pis_value" },
              { label: "COFINS", key: "cofins_value" },
              { label: "INSS", key: "inss_value" },
              { label: "IR", key: "ir_value" },
              { label: "CSLL", key: "csll_value" },
            ].map(({ label, key }) => (
              <div key={key} className="space-y-2">
                <Label>{label} (R$)</Label>
                <Input type="number" step="0.01" min="0" value={(form as Record<string, string | boolean>)[key] as string} onChange={(e) => set(key, e.target.value)} />
              </div>
            ))}
          </div>
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
