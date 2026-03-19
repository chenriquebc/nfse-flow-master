import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, ArrowRight, Check, Briefcase, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CompanyType = "contabilidade" | "empresa" | null;

const steps = [
  { label: "Tipo", icon: Briefcase },
  { label: "Dados", icon: Building2 },
  { label: "Pronto", icon: Check },
];

export default function Onboarding() {
  const { createTenant } = useTenant();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [companyType, setCompanyType] = useState<CompanyType>(null);
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [loading, setLoading] = useState(false);

  const handleNext = () => {
    if (step === 0 && !companyType) {
      toast.error("Selecione o tipo da sua empresa");
      return;
    }
    if (step === 1) {
      if (!name.trim()) {
        toast.error("Informe o nome da empresa");
        return;
      }
      handleSubmit();
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    const id = await createTenant(name, document, "");
    if (id) {
      setStep(2);
    } else {
      toast.error("Erro ao criar escritório. Tente novamente.");
    }
    setLoading(false);
  };

  const handleFinish = () => {
    navigate("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Building2 className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {step === 2 ? "Tudo configurado!" : "Vamos configurar sua empresa"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {step === 2
              ? "Seu ambiente está pronto. Você já pode operar."
              : "Em menos de 1 minuto você estará pronto para começar."}
          </p>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  i < step
                    ? "bg-accent text-accent-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {i < step ? <Check className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  "text-xs font-medium hidden sm:inline",
                  i <= step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={cn(
                    "h-px w-8 sm:w-12 transition-colors duration-300",
                    i < step ? "bg-accent" : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Company type */}
        {step === 0 && (
          <Card className="animate-fade-in">
            <CardContent className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground mb-3">
                  Qual o tipo da sua organização?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCompanyType("contabilidade")}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all duration-200",
                      companyType === "contabilidade"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    )}
                  >
                    <Users className={cn("h-8 w-8", companyType === "contabilidade" ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-sm font-semibold", companyType === "contabilidade" ? "text-primary" : "text-foreground")}>
                        Contabilidade
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Escritório com múltiplos clientes
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompanyType("empresa")}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all duration-200",
                      companyType === "empresa"
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-primary/30 hover:bg-muted/50"
                    )}
                  >
                    <Building2 className={cn("h-8 w-8", companyType === "empresa" ? "text-primary" : "text-muted-foreground")} />
                    <div className="text-center">
                      <p className={cn("text-sm font-semibold", companyType === "empresa" ? "text-primary" : "text-foreground")}>
                        Empresa
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Prestador de serviço ou empresa
                      </p>
                    </div>
                  </button>
                </div>
              </div>
              <Button onClick={handleNext} className="w-full" disabled={!companyType}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Company data */}
        {step === 1 && (
          <Card className="animate-fade-in">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                {companyType === "contabilidade"
                  ? "Informe os dados do seu escritório de contabilidade."
                  : "Informe os dados da sua empresa."}
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    {companyType === "contabilidade" ? "Nome do escritório" : "Nome da empresa"} *
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={
                      companyType === "contabilidade"
                        ? "Ex: Contabilidade Silva & Associados"
                        : "Ex: Tech Solutions Ltda"
                    }
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document">CNPJ</Label>
                  <Input
                    id="document"
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    placeholder="00.000.000/0000-00"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                  Voltar
                </Button>
                <Button onClick={handleNext} className="flex-1" disabled={loading}>
                  {loading ? "Criando..." : "Criar"}
                  {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Success */}
        {step === 2 && (
          <Card className="animate-fade-in">
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                <Check className="h-8 w-8 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Seu ambiente está pronto
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Você tomou a decisão certa. Agora vamos começar a operar.
                </p>
              </div>
              <Button onClick={handleFinish} className="w-full" size="lg">
                Acessar minha plataforma
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
