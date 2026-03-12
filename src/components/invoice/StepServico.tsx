import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface StepServicoProps {
  form: {
    service_description: string;
    tax_code: string;
    nbs_code: string;
    cnae_code: string;
  };
  set: (key: string, value: string | boolean) => void;
}

export default function StepServico({ form, set }: StepServicoProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <FileText className="h-10 w-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Serviço Prestado</h2>
        <p className="text-sm text-muted-foreground">Descreva o serviço e informe os códigos fiscais</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="space-y-2">
            <Label>Descrição do Serviço *</Label>
            <Textarea
              className="min-h-[120px]"
              value={form.service_description}
              onChange={(e) => set("service_description", e.target.value)}
              placeholder="Descreva detalhadamente o serviço prestado..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Código de Tributação *</Label>
              <Input className="h-12" value={form.tax_code} onChange={(e) => set("tax_code", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>NBS</Label>
              <Input className="h-12" value={form.nbs_code} onChange={(e) => set("nbs_code", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>CNAE</Label>
              <Input className="h-12" value={form.cnae_code} onChange={(e) => set("cnae_code", e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
