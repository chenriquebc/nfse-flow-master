import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2 } from "lucide-react";
import { toast } from "sonner";

export default function Onboarding() {
  const { createTenant } = useTenant();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do escritório");
      return;
    }
    setLoading(true);
    const id = await createTenant(name, document, email);
    if (id) {
      toast.success("Escritório criado com sucesso!");
      navigate("/dashboard");
    } else {
      toast.error("Erro ao criar escritório");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent">
            <Building2 className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao NFS-e Pro</h1>
          <p className="mt-2 text-muted-foreground">Configure seu escritório para começar</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dados do Escritório</CardTitle>
            <CardDescription>
              Informe os dados do seu escritório de contabilidade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do escritório *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Contabilidade Silva & Associados"
                  required
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
              <div className="space-y-2">
                <Label htmlFor="email">E-mail do escritório</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contato@escritorio.com"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Escritório"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
