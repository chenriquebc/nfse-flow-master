import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Users, Plus, Pencil, Trash2, AlertTriangle, Crown } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/components/TablePagination";
import { useSubscription } from "@/hooks/useSubscription";

interface MemberRow {
  id: string;
  user_id: string;
  is_active: boolean;
  created_at: string;
  profiles: { full_name: string; email: string } | null;
  user_roles: { role: string }[] | null;
  user_permissions: {
    can_view: boolean;
    can_emit_invoices: boolean;
    can_cancel_invoices: boolean;
    can_delete_invoices: boolean;
    can_manage_companies: boolean;
    can_view_reports: boolean;
  }[] | null;
}

const PLAN_USER_LIMITS: Record<string, number> = {
  starter: 0,
  basic: 0,
  professional: 4,
  enterprise: Infinity,
};

const PERMISSION_LABELS: { key: string; label: string }[] = [
  { key: "can_view", label: "Consultar informações (somente leitura)" },
  { key: "can_emit_invoices", label: "Emitir notas fiscais" },
  { key: "can_cancel_invoices", label: "Cancelar notas fiscais" },
  { key: "can_delete_invoices", label: "Excluir notas fiscais" },
  { key: "can_manage_companies", label: "Cadastrar/editar empresas" },
  { key: "can_view_reports", label: "Acessar relatórios" },
];

export default function UserManagement() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { plan: subscriptionPlan, loading: subLoading } = useSubscription();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MemberRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formPermissions, setFormPermissions] = useState({
    can_view: true,
    can_emit_invoices: false,
    can_cancel_invoices: false,
    can_delete_invoices: false,
    can_manage_companies: false,
    can_view_reports: false,
  });

  const plan = subscriptionPlan || "basic";
  const maxUsers = PLAN_USER_LIMITS[plan] ?? 0;
  const nonAdminMembers = members.filter(
    (m) => !m.user_roles?.some((r) => r.role === "admin")
  );
  const canCreateMore = maxUsers === Infinity || nonAdminMembers.length < maxUsers;

  const fetchMembers = async () => {
    if (!tenant) return;
    setLoading(true);

    // Fetch tenant members (no joins - no FK relationships exist)
    const { data: membersData } = await supabase
      .from("tenant_members")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("created_at");

    if (!membersData || membersData.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const userIds = membersData.map((m: any) => m.user_id);

    // Fetch profiles, roles, and permissions in parallel
    const [profilesRes, rolesRes, permsRes] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds),
      supabase.from("user_roles").select("user_id, role").eq("tenant_id", tenant.id).in("user_id", userIds),
      supabase.from("user_permissions").select("user_id, can_view, can_emit_invoices, can_cancel_invoices, can_manage_companies, can_view_reports").eq("tenant_id", tenant.id).in("user_id", userIds),
    ]);

    const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.user_id, p]));
    const rolesMap = new Map<string, { role: string }[]>();
    (rolesRes.data || []).forEach((r: any) => {
      const arr = rolesMap.get(r.user_id) || [];
      arr.push({ role: r.role });
      rolesMap.set(r.user_id, arr);
    });
    const permsMap = new Map((permsRes.data || []).map((p: any) => [p.user_id, p]));

    const merged = membersData.map((m: any) => ({
      ...m,
      profiles: profileMap.get(m.user_id) || null,
      user_roles: rolesMap.get(m.user_id) || null,
      user_permissions: permsMap.has(m.user_id) ? [permsMap.get(m.user_id)] : null,
    }));

    setMembers(merged as unknown as MemberRow[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [tenant]);

  const resetForm = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormPermissions({
      can_view: true,
      can_emit_invoices: false,
      can_cancel_invoices: false,
      can_delete_invoices: false,
      can_manage_companies: false,
      can_view_reports: false,
    });
    setEditingMember(null);
  };

  const openCreate = () => {
    if (!canCreateMore) {
      toast.error("Limite de usuários atingido", {
        description: maxUsers === 0
          ? "Seu plano não permite usuários adicionais. Faça upgrade para o plano Professional ou Enterprise."
          : `Seu plano permite até ${maxUsers} usuários adicionais. Faça upgrade para adicionar mais.`,
      });
      return;
    }
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (member: MemberRow) => {
    setEditingMember(member);
    setFormName(member.profiles?.full_name || "");
    setFormEmail(member.profiles?.email || "");
    setFormPassword("");
    const perms = member.user_permissions?.[0];
    setFormPermissions({
      can_view: perms?.can_view ?? true,
      can_emit_invoices: perms?.can_emit_invoices ?? false,
      can_cancel_invoices: perms?.can_cancel_invoices ?? false,
      can_manage_companies: perms?.can_manage_companies ?? false,
      can_view_reports: perms?.can_view_reports ?? false,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);

    if (editingMember) {
      const { error } = await supabase
        .from("user_permissions")
        .upsert({
          user_id: editingMember.user_id,
          tenant_id: tenant.id,
          ...formPermissions,
        }, { onConflict: "user_id,tenant_id" });

      if (formName && formName !== editingMember.profiles?.full_name) {
        await supabase
          .from("profiles")
          .update({ full_name: formName })
          .eq("user_id", editingMember.user_id);
      }

      if (error) toast.error("Erro ao salvar permissões");
      else toast.success("Usuário atualizado!");
    } else {
      if (!formEmail || !formName) {
        toast.error("Preencha nome e e-mail");
        setSaving(false);
        return;
      }
      if (!formPassword || formPassword.length < 6) {
        toast.error("Defina uma senha com pelo menos 6 caracteres");
        setSaving(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("provision-account", {
        body: {
          name: formName,
          email: formEmail,
          password: formPassword,
          tenant_id: tenant.id,
          plan: tenant.plan,
          is_member: true,
        },
      });

      // Check for errors - the edge function may return error in body even with 200
      const errorMsg = error?.message || data?.error;
      if (errorMsg) {
        if (errorMsg.includes("already been registered") || errorMsg.includes("email_exists")) {
          toast.error("E-mail já cadastrado", {
            description: "Já existe um usuário com este e-mail. Tente outro endereço.",
          });
        } else {
          toast.error("Erro ao criar usuário", { description: errorMsg });
        }
        setSaving(false);
        return;
      }

      const newUserId = data?.user_id;
      if (newUserId) {
        await supabase.from("user_permissions").upsert({
          user_id: newUserId,
          tenant_id: tenant.id,
          ...formPermissions,
        }, { onConflict: "user_id,tenant_id" });

        toast.success("Usuário criado com sucesso!");
      } else {
        toast.error("Erro ao provisionar usuário");
      }
    }

    setDialogOpen(false);
    resetForm();
    fetchMembers();
    setSaving(false);
  };

  const toggleActive = async (member: MemberRow) => {
    const newActive = !member.is_active;
    await supabase
      .from("tenant_members")
      .update({ is_active: newActive })
      .eq("id", member.id);
    toast.success(newActive ? "Usuário ativado" : "Usuário desativado");
    fetchMembers();
  };

  const handleDelete = async () => {
    if (!deleteTarget || !tenant) return;
    await supabase.from("tenant_members").delete().eq("id", deleteTarget.id);
    await supabase.from("user_roles").delete().eq("user_id", deleteTarget.user_id).eq("tenant_id", tenant.id);
    await supabase.from("user_permissions").delete().eq("user_id", deleteTarget.user_id).eq("tenant_id", tenant.id);
    toast.success("Usuário removido");
    setDeleteTarget(null);
    fetchMembers();
  };

  const isAdmin = (member: MemberRow) => member.user_roles?.some((r) => r.role === "admin");
  const paginated = nonAdminMembers.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-4xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Gerenciamento de Usuários</h1>
            <p className="page-description">Gerencie os usuários do seu escritório</p>
          </div>
          <Button size="sm" onClick={openCreate} disabled={!canCreateMore && maxUsers !== Infinity}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        {/* Plan info card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    Usuários adicionais: {nonAdminMembers.length}
                    {maxUsers !== Infinity && ` / ${maxUsers}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Plano {plan.charAt(0).toUpperCase() + plan.slice(1)}
                    {maxUsers === 0 && " — não permite usuários adicionais"}
                    {maxUsers === Infinity && " — sem limite de usuários"}
                  </p>
                </div>
              </div>
              {maxUsers === 0 && (
                <Badge variant="outline" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Upgrade necessário
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current admin */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-primary" />
              Administrador
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.filter(m => isAdmin(m)).map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {(m.profiles?.full_name || "A").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{m.profiles?.full_name || "Administrador"}</p>
                  <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                </div>
                <Badge variant="default" className="ml-auto">Admin</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Members table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários do escritório</CardTitle>
            <CardDescription>Gerencie permissões e acesso de cada usuário</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : nonAdminMembers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">Nenhum usuário adicional cadastrado</p>
                {maxUsers > 0 && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar usuário
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((m) => {
                        const perms = m.user_permissions?.[0];
                        const permList = [];
                        if (perms?.can_emit_invoices) permList.push("Emitir");
                        if (perms?.can_cancel_invoices) permList.push("Cancelar");
                        if (perms?.can_manage_companies) permList.push("Empresas");
                        if (perms?.can_view_reports) permList.push("Relatórios");
                        if (permList.length === 0) permList.push("Somente leitura");

                        return (
                          <TableRow key={m.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{m.profiles?.full_name || "—"}</p>
                                <p className="text-xs text-muted-foreground">{m.profiles?.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {permList.map((p) => (
                                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={m.is_active}
                                  onCheckedChange={() => toggleActive(m)}
                                />
                                <span className={`text-xs ${m.is_active ? "text-foreground" : "text-muted-foreground"}`}>
                                  {m.is_active ? "Ativo" : "Inativo"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(m)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(m)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  total={nonAdminMembers.length}
                  page={page}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMember ? "Editar Usuário" : "Novo Usuário"}</DialogTitle>
            <DialogDescription>
              {editingMember ? "Atualize os dados e permissões do usuário" : "Crie um novo usuário para o escritório"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Nome completo</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Nome do usuário" required />
            </div>
            {!editingMember && (
              <>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="usuario@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={formPassword} onChange={(e) => setFormPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required />
                </div>
              </>
            )}

            <div className="space-y-3">
              <Label className="text-sm font-semibold">Permissões</Label>
              {PERMISSION_LABELS.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <Checkbox
                    checked={(formPermissions as any)[key]}
                    onCheckedChange={(checked) =>
                      setFormPermissions((p) => ({ ...p, [key]: !!checked }))
                    }
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Salvando..." : editingMember ? "Salvar alterações" : "Criar usuário"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover <strong>{deleteTarget?.profiles?.full_name}</strong>?
              O usuário perderá acesso ao escritório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover usuário
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
