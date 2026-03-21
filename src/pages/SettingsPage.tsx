import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Building2, User, Lock } from "lucide-react";
import { toast } from "sonner";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export default function SettingsPage() {
  const { tenant, refetch } = useTenant();
  const { user } = useAuth();
  const { permissions } = useUserPermissions();

  const [tenantName, setTenantName] = useState("");
  const [tenantDoc, setTenantDoc] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [saving, setSaving] = useState(false);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (tenant) {
      setTenantName(tenant.name);
      setTenantDoc(tenant.document);
      setTenantEmail(tenant.email);
    }
    if (user) {
      setProfileName(user.user_metadata?.full_name || "");
    }
  }, [tenant, user]);

  const saveTenant = async () => {
    if (!tenant) return;
    setSaving(true);
    const { error } = await supabase
      .from("tenants")
      .update({ name: tenantName, document: tenantDoc, email: tenantEmail })
      .eq("id", tenant.id);
    if (error) toast.error("Erro ao salvar");
    else { toast.success("Escritório atualizado!"); refetch(); }
    setSaving(false);
  };

  const saveProfile = async () => {
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: profileName } });
    if (error) toast.error("Erro ao atualizar perfil");
    else {
      await supabase.from("profiles").update({ full_name: profileName }).eq("user_id", user!.id);
      toast.success("Perfil atualizado!");
    }
    setSaving(false);
  };

  const changePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error("Erro ao alterar senha", { description: error.message });
    else {
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    }
    setSavingPassword(false);
  };

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-2xl">
        <div className="page-header">
          <h1 className="page-title">Configurações</h1>
          <p className="page-description">Gerencie seu escritório e perfil</p>
        </div>

        <div className="space-y-6">
          {permissions.isAdmin && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Dados do Escritório</CardTitle>
                </div>
                <CardDescription>Informações do escritório de contabilidade</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input value={tenantName} onChange={(e) => setTenantName(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>CNPJ</Label>
                    <Input value={tenantDoc} onChange={(e) => setTenantDoc(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input value={tenantEmail} onChange={(e) => setTenantEmail(e.target.value)} />
                  </div>
                </div>
                <Button onClick={saveTenant} disabled={saving} size="sm">
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Meu Perfil</CardTitle>
              </div>
              <CardDescription>Seus dados pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input value={user?.email || ""} disabled className="bg-muted" />
              </div>
              <Button onClick={saveProfile} disabled={saving} size="sm">
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Alterar Senha</CardTitle>
              </div>
              <CardDescription>Defina uma nova senha para sua conta</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nova senha</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="space-y-2">
                <Label>Confirmar nova senha</Label>
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repita a senha" />
              </div>
              <Button onClick={changePassword} disabled={savingPassword} size="sm">
                <Save className="mr-2 h-4 w-4" />
                {savingPassword ? "Alterando..." : "Alterar senha"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
