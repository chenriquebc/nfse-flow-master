import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, CalendarDays } from "lucide-react";

interface Company {
  id: string;
  legal_name: string;
}

interface StepEmpresaProps {
  form: { company_id: string; competence_date: string };
  set: (key: string, value: string | boolean) => void;
  companies: Company[];
}

export default function StepEmpresa({ form, set, companies }: StepEmpresaProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-6">
        <Building2 className="h-10 w-10 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground">Empresa e Competência</h2>
        <p className="text-sm text-muted-foreground">Selecione a empresa emitente e a data de competência</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          <div className="space-y-2">
            <Label>Empresa Emitente *</Label>
            <Select value={form.company_id} onValueChange={(v) => set("company_id", v)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione a empresa..." />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Data de Competência *
            </Label>
            <Input
              type="date"
              className="h-12"
              value={form.competence_date}
              onChange={(e) => set("competence_date", e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
