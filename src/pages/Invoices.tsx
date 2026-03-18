import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Plus, Search, FileText, Download, Send, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  rps_number: number | null;
  invoice_number: number | null;
  taker_name: string;
  taker_document: string;
  service_value: number;
  status: string;
  competence_date: string;
  created_at: string;
  companies: { legal_name: string } | null;
}

export default function Invoices() {
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmEmit, setConfirmEmit] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const fetchInvoices = async () => {
    if (!tenant) return;
    let query = supabase
      .from("nfse_invoices")
      .select("*, companies(legal_name)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter as any);
    }

    const { data } = await query;
    setInvoices((data as unknown as Invoice[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInvoices();
  }, [tenant, statusFilter]);

  const handleEmit = async (invoiceId: string) => {
    setConfirmEmit(null);
    setEmitting(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("emit-nfse", {
        body: { invoice_id: invoiceId },
      });

      if (error) {
        toast.error("Erro ao emitir nota", { description: error.message });
      } else if (data?.success) {
        toast.success("NFS-e autorizada com sucesso!", {
          description: data.chave_acesso ? `Chave: ${data.chave_acesso}` : undefined,
        });
      } else {
        toast.error("Nota rejeitada", {
          description: data?.error_message || "Verifique os dados e tente novamente",
        });
      }
      await fetchInvoices();
    } catch (e) {
      toast.error("Erro de comunicação ao emitir nota");
    } finally {
      setEmitting(null);
    }
  };

  const handleCancel = async (invoiceId: string) => {
    setConfirmCancel(null);
    setCancelling(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("query-nfse", {
        body: { action: "cancel", invoice_id: invoiceId, reason: "Cancelamento solicitado pelo emitente" },
      });

      if (error) {
        toast.error("Erro ao cancelar nota", { description: error.message });
      } else if (data?.success) {
        toast.success("NFS-e cancelada com sucesso!");
      } else {
        toast.error("Falha ao cancelar nota", { description: data?.error || "Tente novamente" });
      }
      await fetchInvoices();
    } catch (e) {
      toast.error("Erro de comunicação ao cancelar nota");
    } finally {
      setCancelling(null);
    }
  };

  const filtered = invoices.filter(
    (i) =>
      i.taker_name.toLowerCase().includes(search.toLowerCase()) ||
      i.taker_document.includes(search)
  );

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Notas Fiscais</h1>
            <p className="page-description">Gerencie suas NFS-e emitidas</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Link to="/invoices/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nova Nota
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por tomador ou CPF/CNPJ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="authorized">Autorizada</SelectItem>
                  <SelectItem value="rejected">Rejeitada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhuma nota fiscal encontrada</p>
                <Link to="/invoices/new" className="mt-4">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Emitir primeira nota
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table className="min-w-[740px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Tomador</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Competência</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/invoices/${inv.id}`)}>
                        <TableCell className="font-mono text-sm">
                          {inv.invoice_number || inv.rps_number || "—"}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{inv.taker_name || "—"}</p>
                            <p className="text-xs text-muted-foreground font-mono">{inv.taker_document}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {inv.companies?.legal_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(inv.competence_date).toLocaleDateString("pt-BR")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(inv.service_value))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {inv.status === "draft" && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 text-xs"
                                disabled={emitting === inv.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmEmit(inv.id);
                                }}
                              >
                                {emitting === inv.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Send className="h-3 w-3 mr-1" />
                                )}
                                Emitir
                              </Button>
                            )}
                            {inv.status === "authorized" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-xs"
                                disabled={cancelling === inv.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmCancel(inv.id);
                                }}
                              >
                                {cancelling === inv.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <XCircle className="h-3 w-3 mr-1" />
                                )}
                                Cancelar
                              </Button>
                            )}
                            {inv.status === "rejected" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/invoices/${inv.id}/edit`);
                              >
                                Editar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirm Emit Dialog */}
      <AlertDialog open={!!confirmEmit} onOpenChange={() => setConfirmEmit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emitir Nota Fiscal</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja emitir esta nota fiscal? A DPS será enviada ao portal nacional da NFS-e para validação e geração da nota.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmEmit && handleEmit(confirmEmit)}>
              Emitir NFS-e
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Cancel Dialog */}
      <AlertDialog open={!!confirmCancel} onOpenChange={() => setConfirmCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Nota Fiscal</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta NFS-e? Esta ação enviará um evento de cancelamento ao portal nacional e não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => confirmCancel && handleCancel(confirmCancel)}>
              Cancelar NFS-e
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
