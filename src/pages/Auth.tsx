import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Eye, EyeOff, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Auth() {
  const { user, signIn, signUp, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // When user is already logged in, check admin status and redirect
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

  // Show spinner while checking logged-in user
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin || isAdminLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Erro ao entrar", { description: error.message });
        setLoading(false);
        return;
      }

      // If admin login, verify admin status
      if (isAdminLogin) {
        const { data: { user: loggedUser } } = await supabase.auth.getUser();
        if (loggedUser) {
          const { data: isAdmin } = await supabase.rpc("is_platform_admin", { _user_id: loggedUser.id });
          if (!isAdmin) {
            toast.error("Acesso negado", { description: "Você não é um administrador da plataforma." });
            await supabase.auth.signOut();
            setLoading(false);
            return;
          }
          // Redirect happens via useEffect
        }
      }
      // Normal login redirect happens via useEffect
    } else {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="mb-8 text-center">
          {isAdminLogin ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-destructive shadow-lg">
              <Shield className="h-7 w-7 text-destructive-foreground" />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary shadow-lg">
              <FileText className="h-7 w-7 text-primary-foreground" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {isAdminLogin ? "Admin" : "NFS-e Pro"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdminLogin ? "Painel de gestão da plataforma" : "Emissor Nacional de Notas Fiscais"}
          </p>
        </div>

        <Card className={`border-border shadow-lg ${isAdminLogin ? "border-destructive/30" : ""}`}>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">
              {isAdminLogin ? "Acesso Admin" : isLogin ? "Entrar" : "Criar conta"}
            </CardTitle>
            <CardDescription>
              {isAdminLogin
                ? "Entre com suas credenciais de administrador"
                : isLogin
                  ? "Acesse sua conta para gerenciar notas fiscais"
                  : "Crie uma conta para começar a emitir notas"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isAdminLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    required={!isLogin && !isAdminLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
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
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                variant={isAdminLogin ? "destructive" : "default"}
                disabled={loading}
              >
                {loading ? "Aguarde..." : isAdminLogin ? "Entrar como Admin" : isLogin ? "Entrar" : "Criar conta"}
              </Button>
            </form>

            {!isAdminLogin && (
              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  {isLogin ? "Não tem conta? " : "Já tem conta? "}
                </span>
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-medium text-primary hover:underline"
                >
                  {isLogin ? "Criar conta" : "Fazer login"}
                </button>
              </div>
            )}

            {isAdminLogin && (
              <div className="mt-6 text-center text-sm">
                <button
                  onClick={() => { setIsAdminLogin(false); setIsLogin(true); }}
                  className="font-medium text-primary hover:underline"
                >
                  ← Voltar ao login
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Admin link */}
        {!isAdminLogin && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsAdminLogin(true); setEmail(""); setPassword(""); }}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
