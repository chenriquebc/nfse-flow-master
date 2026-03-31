import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, UserRound, Pencil, Trash2, Mail, MailX } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/components/TablePagination";
import { Badge } from "@/components/ui/badge";

interface ServiceTaker {
  id: string;
  document: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_city: string | null;
  address_state: string | null;
  auto_send_email: boolean;
  created_at: string;
}

export default function Takers() {
  const { tenant } = useTenant();
  const [takers, setTakers] = useState<ServiceTaker[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<ServiceTaker | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchTakers = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from("service_takers")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("name");
    setTakers((data as ServiceTaker[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchTakers();
  }, [tenant]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("service_takers").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erro ao excluir tomador", { description: error.message });
    } else {
      toast.success("Tomador excluído com sucesso!");
      fetchTakers();
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const filtered = takers.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.document.includes(search)
  );

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Tomadores de Serviço</h1>
            <p className="page-description">Gerencie sua base de tomadores</p>
          </div>
          <Link to="/takers/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Novo Tomador
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  className="pl-9"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <UserRound className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhum tomador cadastrado</p>
                <Link to="/takers/new" className="mt-4">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar tomador
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome / Razão Social</TableHead>
                        <TableHead>CPF/CNPJ</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Cidade/UF</TableHead>
                        <TableHead>Envio auto.</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.name || "—"}</TableCell>
                          <TableCell className="font-mono text-sm">{t.document}</TableCell>
                          <TableCell>{t.email || "—"}</TableCell>
                          <TableCell>
                            {t.address_city && t.address_state
                              ? `${t.address_city}/${t.address_state}`
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {t.auto_send_email ? (
                              <Badge variant="default" className="gap-1 text-xs">
                                <Mail className="h-3 w-3" /> Sim
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                <MailOff className="h-3 w-3" /> Não
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Link to={`/takers/${t.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(t)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <TablePagination
                  total={filtered.length}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Tomador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.name}</strong>?
              Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir tomador"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
