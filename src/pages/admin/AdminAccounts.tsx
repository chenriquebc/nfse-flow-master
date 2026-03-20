import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, MoreHorizontal, UserCheck, UserX } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TenantRow {
  id: string;
  name: string;
  email: string;
  document: string;
  plan: string;
  subscription_status: string;
  is_active: boolean;
  created_at: string;
}

const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  trialing: { label: "Trial", variant: "secondary" },
  past_due: { label: "Inadimplente", variant: "destructive" },
  canceled: { label: "Cancelado", variant: "outline" },
  suspended: { label: "Suspenso", variant: "destructive" },
};

export default function AdminAccounts() {
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Provision form
  const [provName, setProvName] = useState("");
  const [provEmail, setProvEmail] = useState("");
  const [provDocument, setProvDocument] = useState("");
  const [provPlan, setProvPlan] = useState("basic");
  const [provLoading, setProvLoading] = useState(false);

  const fetchTenants = async () => {
    const { data } = await supabase.from("tenants").select("*").order("created_at", { ascending: false });
    if (data) setTenants(data as TenantRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const filtered = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase()) ||
    t.document.includes(search)
  );

  const toggleActive = async (tenant: TenantRow) => {
    const newActive = !tenant.is_active;
    const { error } = await supabase
      .from("tenants")
      .update({ is_active: newActive, subscription_status: newActive ? "active" : "suspended" })
      .eq("id", tenant.id);

    if (error) {
      toast.error("Erro ao atualizar conta");
    } else {
      toast.success(newActive ? "Conta ativada" : "Conta suspensa");
      fetchTenants();
    }
  };

  const updatePlan = async (tenantId: string, plan: string) => {
    const { error } = await supabase.from("tenants").update({ plan }).eq("id", tenantId);
    if (error) toast.error("Erro ao atualizar plano");
    else { toast.success("Plano atualizado"); fetchTenants(); }
  };

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provName || !provEmail) { toast.error("Preencha nome e e-mail"); return; }

    setProvLoading(true);

    // Create tenant via edge function (provisions user + tenant)
    const { data, error } = await supabase.functions.invoke("provision-account", {
      body: { name: provName, email: provEmail, document: provDocument, plan: provPlan },
    });

    if (error) {
      toast.error("Erro ao provisionar conta", { description: error.message });
    } else {
      toast.success("Conta provisionada!", { description: `Credenciais enviadas para ${provEmail}` });
      setDialogOpen(false);
      setProvName(""); setProvEmail(""); setProvDocument(""); setProvPlan("basic");
      fetchTenants();
    }

    setProvLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestão de Contas</h1>
          <p className="text-muted-foreground">Gerencie todas as contas da plataforma</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Provisionar Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Provisionar nova conta</DialogTitle>
              <DialogDescription>
                Cria um tenant e envia credenciais temporárias por e-mail
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleProvision} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do escritório</Label>
                <Input value={provName} onChange={e => setProvName(e.target.value)} placeholder="Ex: Contabilidade Silva" required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={provEmail} onChange={e => setProvEmail(e.target.value)} placeholder="cliente@email.com" required />
              </div>
              <div className="space-y-2">
                <Label>CNPJ/CPF</Label>
                <Input value={provDocument} onChange={e => setProvDocument(e.target.value)} placeholder="00.000.000/0001-00" />
              </div>
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={provPlan} onValueChange={setProvPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={provLoading}>
                {provLoading ? "Provisionando..." : "Criar e enviar credenciais"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, e-mail ou documento..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Conta</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma conta encontrada</TableCell>
                </TableRow>
              ) : (
                filtered.map(t => {
                  const status = statusMap[t.subscription_status] || statusMap.trialing;
                  return (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{t.name}</p>
                          <p className="text-xs text-muted-foreground">{t.email || t.document}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={t.plan} onValueChange={val => updatePlan(t.id, val)}>
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="basic">Basic</SelectItem>
                            <SelectItem value="professional">Professional</SelectItem>
                            <SelectItem value="enterprise">Enterprise</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => toggleActive(t)}>
                              {t.is_active ? (
                                <><UserX className="mr-2 h-4 w-4" /> Suspender</>
                              ) : (
                                <><UserCheck className="mr-2 h-4 w-4" /> Ativar</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
