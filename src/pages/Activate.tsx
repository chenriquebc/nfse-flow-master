import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useActivation } from "@/hooks/useActivation";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Activate() {
  const { user } = useAuth();
  const { mustActivate, loading: activationLoading } = useActivation();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (activationLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!mustActivate) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Informe seu nome completo");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("A senha deve ter no mínimo 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    // Update password
    const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
    if (pwError) {
      toast.error("Erro ao atualizar senha", { description: pwError.message });
      setLoading(false);
      return;
    }

    // Update profile
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        must_change_password: false,
        activated_at: new Date().toISOString(),
      })
      .eq("user_id", user!.id);

    if (profileError) {
      toast.error("Erro ao atualizar perfil", { description: profileError.message });
      setLoading(false);
      return;
    }

    // Update auth metadata
    await supabase.auth.updateUser({ data: { full_name: fullName } });

    toast.success("Conta ativada com sucesso!");
    navigate("/dashboard", { replace: true });
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent shadow-lg">
            <ShieldCheck className="h-7 w-7 text-accent-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Ativar sua conta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirme sua identidade e defina uma nova senha para continuar
          </p>
        </div>

        <Card className="border-border shadow-lg">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Primeiro acesso</CardTitle>
            <CardDescription>
              Para sua segurança, defina uma nova senha pessoal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Nome completo</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  required
                  minLength={8}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Ativando..." : "Ativar conta"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
