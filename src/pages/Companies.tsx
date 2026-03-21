import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Building2, Pencil, Trash2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import TablePagination from "@/components/TablePagination";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface Company {
  id: string;
  legal_name: string;
  trade_name: string | null;
  document: string;
  email: string | null;
  is_active: boolean;
  environment: number;
  created_at: string;
}

export default function Companies() {
  const { tenant } = useTenant();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchCompanies = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from("companies")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("legal_name");
    setCompanies((data as Company[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, [tenant]);

  const toggleEnvironment = async (company: Company) => {
    const newEnv = company.environment === 1 ? 2 : 1;
    const { error } = await supabase
      .from("companies")
      .update({ environment: newEnv })
      .eq("id", company.id);
    if (error) {
      toast.error("Erro ao alterar ambiente", { description: error.message });
    } else {
      toast.success(`Ambiente alterado para ${newEnv === 1 ? "Produção" : "Homologação"}`);
      fetchCompanies();
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    // Delete certificates first
    const { data: certs } = await supabase
      .from("certificates")
      .select("id, file_path")
      .eq("company_id", deleteTarget.id);
    if (certs && certs.length > 0) {
      await supabase.storage.from("certificates").remove(certs.map((c) => c.file_path));
      await supabase.from("certificates").delete().eq("company_id", deleteTarget.id);
    }
    // Delete invoices
    await supabase.from("nfse_invoices").delete().eq("company_id", deleteTarget.id);
    // Delete company
    const { error } = await supabase.from("companies").delete().eq("id", deleteTarget.id);
    if (error) {
      toast.error("Erro ao excluir empresa", { description: error.message });
    } else {
      toast.success("Empresa excluída com sucesso!");
      fetchCompanies();
    }
    setDeleteTarget(null);
    setDeleting(false);
  };

  const filtered = companies.filter(
    (c) =>
      c.legal_name.toLowerCase().includes(search.toLowerCase()) ||
      c.document.includes(search)
  );

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Empresas</h1>
            <p className="page-description">Gerencie as empresas clientes do escritório</p>
          </div>
          <Link to="/companies/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nova Empresa
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou CNPJ..."
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
                <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhuma empresa cadastrada</p>
                <Link to="/companies/new" className="mt-4">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar empresa
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="rounded-lg border border-border overflow-x-auto">
                  <Table className="min-w-[640px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Razão Social</TableHead>
                        <TableHead>CNPJ</TableHead>
                        <TableHead>E-mail</TableHead>
                        <TableHead>Ambiente</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">
                            {c.legal_name}
                            {c.trade_name && (
                              <span className="block text-xs text-muted-foreground">{c.trade_name}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{c.document}</TableCell>
                          <TableCell>{c.email || "—"}</TableCell>
                          <TableCell>
                            <span className={`status-badge ${c.environment === 1 ? "status-authorized" : "status-processing"}`}>
                              {c.environment === 1 ? "Produção" : "Homologação"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`status-badge ${c.is_active ? "status-authorized" : "status-cancelled"}`}>
                              {c.is_active ? "Ativa" : "Inativa"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => toggleEnvironment(c)}
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Alternar para {c.environment === 1 ? "Homologação" : "Produção"}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <Link to={`/companies/${c.id}`}>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget(c)}
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

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Empresa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteTarget?.legal_name}</strong>?
              Esta ação é irreversível e excluirá também todos os certificados digitais e notas fiscais associados a esta empresa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir empresa"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
