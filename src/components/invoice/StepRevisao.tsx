import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, Building2, UserRound, FileText, Calculator, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface Company {
  id: string;
  legal_name: string;
}

interface StepRevisaoProps {
  form: Record<string, string | boolean>;
  companies: Company[];
  baseValue: number;
  issValue: number;
  totalDeductions: number;
  netValue: number;
  formatCurrency: (v: number) => string;
  onEmit?: () => void;
  emitting?: boolean;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "0") return null;
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm font-medium text-foreground text-right max-w-[60%] break-words">{value}</span>
    </div>
  );
}

export default function StepRevisao({ form, companies, baseValue, issValue, totalDeductions, netValue, formatCurrency, onEmit, emitting }: StepRevisaoProps) {
  const companyName = companies.find((c) => c.id === form.company_id)?.legal_name || "—";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <ClipboardCheck className="h-10 w-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Revisão da Nota</h2>
        <p className="text-sm text-muted-foreground">Confira os dados antes de salvar o rascunho</p>
      </div>

      {/* Empresa */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Empresa</h3>
          </div>
          <InfoRow label="Emitente" value={companyName} />
          <InfoRow label="Competência" value={form.competence_date as string} />
        </CardContent>
      </Card>

      {/* Tomador */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <UserRound className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Tomador</h3>
          </div>
          <InfoRow label="CPF/CNPJ" value={form.taker_document as string} />
          <InfoRow label="Nome" value={form.taker_name as string} />
          <InfoRow label="E-mail" value={form.taker_email as string} />
          <InfoRow label="Telefone" value={form.taker_phone as string} />
          <InfoRow label="Endereço" value={[form.taker_address_street, form.taker_address_number].filter(Boolean).join(", ")} />
          <InfoRow label="Cidade/UF" value={[form.taker_address_city, form.taker_address_state].filter(Boolean).join(" - ")} />
          <InfoRow label="CEP" value={form.taker_address_zip as string} />
        </CardContent>
      </Card>

      {/* Serviço */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Serviço</h3>
          </div>
          <div className="text-sm text-foreground bg-muted rounded-md p-3 mb-2 whitespace-pre-wrap">
            {(form.service_description as string) || "—"}
          </div>
          <InfoRow label="Cód. Tributação" value={form.tax_code as string} />
          <InfoRow label="NBS" value={form.nbs_code as string} />
          <InfoRow label="CNAE" value={form.cnae_code as string} />
        </CardContent>
      </Card>

      {/* Valores */}
      <Card className="border-primary/20">
        <CardContent className="pt-5">
          <div className="flex items-center gap-2 mb-3">
            <Calculator className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Valores</h3>
          </div>
          <InfoRow label="Valor do Serviço" value={formatCurrency(parseFloat(form.service_value as string) || 0)} />
          <InfoRow label="Deduções" value={formatCurrency(parseFloat(form.deduction_value as string) || 0)} />
          <InfoRow label="Desconto" value={formatCurrency(parseFloat(form.discount_value as string) || 0)} />
          <Separator className="my-2" />
          <InfoRow label="Base de Cálculo" value={formatCurrency(baseValue)} />
          <InfoRow label={`ISS (${form.iss_rate}%)`} value={formatCurrency(issValue)} />
          <InfoRow label="ISS Retido" value={form.iss_retained ? "Sim" : "Não"} />
          <InfoRow label="PIS" value={formatCurrency(parseFloat(form.pis_value as string) || 0)} />
          <InfoRow label="COFINS" value={formatCurrency(parseFloat(form.cofins_value as string) || 0)} />
          <InfoRow label="INSS" value={formatCurrency(parseFloat(form.inss_value as string) || 0)} />
          <InfoRow label="IR" value={formatCurrency(parseFloat(form.ir_value as string) || 0)} />
          <InfoRow label="CSLL" value={formatCurrency(parseFloat(form.csll_value as string) || 0)} />
          <Separator className="my-2" />
          <div className="flex justify-between py-2">
            <span className="font-semibold text-foreground">Valor Líquido</span>
            <span className="font-bold text-primary text-lg">{formatCurrency(netValue)}</span>
          </div>
        </CardContent>
      </Card>

      {form.notes && (
        <Card>
          <CardContent className="pt-5">
            <h3 className="text-sm font-semibold text-foreground mb-2">Observações</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{form.notes as string}</p>
          </CardContent>
        </Card>
      )}

      {onEmit && (
        <div className="flex justify-center pt-2">
          <Button onClick={onEmit} disabled={emitting} variant="default" size="lg" className="gap-2">
            <Send className="h-4 w-4" />
            {emitting ? "Emitindo..." : "Salvar e Emitir NFS-e"}
          </Button>
        </div>
      )}
    </div>
  );
}
