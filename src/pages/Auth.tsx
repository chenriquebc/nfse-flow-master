import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, EyeOff, Shield, Mail } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type AuthMode = "login" | "register" | "admin" | "forgot";

export default function Auth() {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  useEffect(() => {
    if (!user || authLoading) return;
    const checkAndRedirect = async () => {
      const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: user.id });
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    };
    checkAndRedirect();
  }, [user, authLoading, navigate]);

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe seu e-mail");
      return;
    }
    setLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotSent(true);
    toast.success("E-mail enviado!", {
      description: "Se este e-mail estiver cadastrado, você receberá um link para redefinir sua senha.",
    });
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "login" || mode === "admin") {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Erro ao entrar", { description: error.message });
        setLoading(false);
        return;
      }
      if (mode === "admin") {
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) {
          const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: loggedUser.id });
          if (!isAdmin) {
            toast.error("Acesso negado", { description: "Você não é um administrador da plataforma." });
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
        }
      }
    } else if (mode === "register") {
      if (!fullName.trim()) {
        toast.error("Informe seu nome completo");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast.error("Erro ao criar conta", { description: error.message });
      } else {
        toast.success("Conta criada!", { description: "Verifique seu e-mail para confirmar." });
      }
    }
    setLoading(false);
  };

  // Forgot password view
  if (mode === "forgot") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-[380px] animate-fade-in">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
              <Mail className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground" style={{ letterSpacing: "-0.025em" }}>
              Recuperar senha
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {forgotSent
                ? "Verifique sua caixa de entrada"
                : "Informe seu e-mail para receber o link"}
            </p>
          </div>

          <Card className="shadow-md border-border/80">
            <CardContent className="pt-5">
              {!forgotSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-[0.8125rem]">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar link de recuperação"}
                  </Button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                    <Mail className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    O link expira em 1 hora. Caso não receba, tente novamente.
                  </p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setForgotSent(false); setEmail(""); }}
                  >
                    Enviar novamente
                  </Button>
                </div>
              )}

              <div className="mt-5 text-center text-sm">
                <button
                  onClick={() => { setMode("login"); setForgotSent(false); }}
                  className="font-medium text-primary hover:underline text-[0.8125rem]"
                >
                  ← Voltar ao login
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-[380px] animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          {mode === "admin" ? (
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-destructive shadow-sm">
              <Shield className="h-5 w-5 text-destructive-foreground" />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-sm">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-xl font-bold text-foreground" style={{ letterSpacing: "-0.025em" }}>
            {mode === "admin" ? "Admin" : "NFS-e Pro"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "admin" ? "Painel de gestão da plataforma" : "Emissor Nacional de Notas Fiscais"}
          </p>
        </div>

        <Card className={`shadow-md border-border/80 ${mode === "admin" ? "border-destructive/20" : ""}`}>
          <CardHeader className="text-center pb-2 pt-5 px-5">
            <CardTitle className="text-lg">
              {mode === "admin" ? "Acesso Admin" : mode === "login" ? "Entrar" : "Criar conta"}
            </CardTitle>
            <CardDescription className="text-[0.8125rem]">
              {mode === "admin"
                ? "Entre com suas credenciais de administrador"
                : mode === "login"
                  ? "Acesse sua conta para gerenciar notas fiscais"
                  : "Crie uma conta para começar a emitir notas"}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-[0.8125rem]">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    required={mode === "register"}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[0.8125rem]">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[0.8125rem]">Senha</Label>
                  {(mode === "login" || mode === "admin") && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueci minha senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                variant={mode === "admin" ? "destructive" : "default"}
                disabled={loading}
              >
                {loading ? "Aguarde..." : mode === "admin" ? "Entrar como Admin" : mode === "login" ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            {mode !== "admin" && (
              <div className="mt-5 text-center text-[0.8125rem]">
                <span className="text-muted-foreground">
                  {mode === "login" ? "Não tem conta? " : "Já tem conta? "}
                </span>
                <button
                  onClick={() => setMode(mode === "login" ? "register" : "login")}
                  className="font-medium text-primary hover:underline"
                >
                  {mode === "login" ? "Criar conta" : "Fazer login"}
                </button>
              </div>
            )}

            {mode === "admin" && (
              <div className="mt-5 text-center text-[0.8125rem]">
                <button
                  onClick={() => setMode("login")}
                  className="font-medium text-primary hover:underline"
                >
                  ← Voltar ao login
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {mode !== "admin" && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <a
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              ← Voltar para o site
            </a>
            <span className="text-border">|</span>
            <button
              onClick={() => { setMode("admin"); setEmail(""); setPassword(""); }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              <Shield className="h-3 w-3" />
              Admin
            </button>
          </div>
        )}
      </div>
    </div>
  );
}