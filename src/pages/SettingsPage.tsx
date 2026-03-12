import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Building2, User } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { tenant, refetch } = useTenant();
  const { user } = useAuth();

  const [tenantName, setTenantName] = useState("");
  const [tenantDoc, setTenantDoc] = useState("");
  const [tenantEmail, setTenantEmail] = useState("");
  const [profileName, setProfileName] = useState("");
  const [saving, setSaving] = useState(false);

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

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-2xl">
        <div className="page-header">
          <h1 className="page-title">Configurações</h1>
          <p className="page-description">Gerencie seu escritório e perfil</p>
        </div>

        <div className="space-y-6">
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
        </div>
      </div>
    </AppLayout>
  );
}
