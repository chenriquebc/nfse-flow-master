import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import TablePagination from "@/components/TablePagination";
import { useTenant } from "@/contexts/TenantContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Search, FileText, Download, Send, XCircle, Loader2, AlertTriangle, CheckCircle2, Clock, Info, ChevronDown, ChevronUp, RotateCcw, MoreVertical, Eye, ArrowUpDown, Code } from "lucide-react";
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
  metadata?: any;
  companies: { legal_name: string } | null;
}

interface InvoiceEvent {
  id: string;
  event_type: string;
  error_message: string | null;
  error_code: string | null;
  description: string | null;
  request_xml: string | null;
  response_xml: string | null;
  metadata: any;
  created_at: string;
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof Info; color: string }> = {
  created: { label: "Criado", icon: Info, color: "text-blue-500" },
  xml_generated: { label: "XML Gerado", icon: FileText, color: "text-blue-500" },
  xml_signed: { label: "XML Assinado", icon: CheckCircle2, color: "text-emerald-500" },
  submitted: { label: "Enviado à SEFIN", icon: Send, color: "text-amber-500" },
  protocol_received: { label: "Protocolo Recebido", icon: CheckCircle2, color: "text-emerald-500" },
  authorized: { label: "Autorizada", icon: CheckCircle2, color: "text-emerald-600" },
  rejected: { label: "Rejeitada", icon: XCircle, color: "text-destructive" },
  cancelled: { label: "Cancelada", icon: XCircle, color: "text-muted-foreground" },
  error: { label: "Erro", icon: AlertTriangle, color: "text-destructive" },
};

export default function Invoices() {
  const { tenant } = useTenant();
  const { permissions } = useUserPermissions();
  const canEmit = permissions.isAdmin || permissions.can_emit_invoices;
  const canCancel = permissions.isAdmin || permissions.can_cancel_invoices;
  const navigate = useNavigate();
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [emitting, setEmitting] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [confirmEmit, setConfirmEmit] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Invoice | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelDetailsOpen, setCancelDetailsOpen] = useState(false);
  const [confirmResend, setConfirmResend] = useState<string | null>(null);
  const [eventLogInvoice, setEventLogInvoice] = useState<Invoice | null>(null);
  const [events, setEvents] = useState<InvoiceEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchEvents = async (invoiceId: string) => {
    setLoadingEvents(true);
    const { data } = await supabase
      .from("nfse_events")
      .select("*")
      .eq("invoice_id", invoiceId)
      .order("created_at", { ascending: true });
    setEvents((data as unknown as InvoiceEvent[]) || []);
    setLoadingEvents(false);
  };

  const openEventLog = (inv: Invoice) => {
    setEventLogInvoice(inv);
    setExpandedEvent(null);
    fetchEvents(inv.id);
  };

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

  const handleCancel = async (invoiceId: string, reason: string) => {
    setConfirmCancel(null);
    setCancelReason("");
    setCancelling(invoiceId);
    try {
      const { data, error } = await supabase.functions.invoke("query-nfse", {
        body: { action: "cancel", invoice_id: invoiceId, reason },
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

  const handleResend = async (invoiceId: string) => {
    setConfirmResend(null);
    setResending(invoiceId);
    try {
      // Reset status to draft first
      await supabase
        .from("nfse_invoices")
        .update({ status: "draft" as any })
        .eq("id", invoiceId);

      // Then emit
      const { data, error } = await supabase.functions.invoke("emit-nfse", {
        body: { invoice_id: invoiceId },
      });

      if (error) {
        toast.error("Erro ao reenviar nota", { description: error.message });
      } else if (data?.success) {
        toast.success("NFS-e autorizada com sucesso!", {
          description: data.chave_acesso ? `Chave: ${data.chave_acesso}` : undefined,
        });
      } else {
        toast.error("Nota rejeitada novamente", {
          description: data?.error_message || "Verifique os dados e tente novamente",
        });
      }
      await fetchInvoices();
    } catch (e) {
      toast.error("Erro de comunicação ao reenviar nota");
    } finally {
      setResending(null);
    }
  };

  const filtered = invoices.filter(
    (i) =>
      i.taker_name.toLowerCase().includes(search.toLowerCase()) ||
      i.taker_document.includes(search)
  );

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

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
            {canEmit && (
              <Link to="/invoices/new">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Nota
                </Button>
              </Link>
            )}
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
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
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
              <>
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
                    {paginated.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-muted/50">
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
                          {inv.competence_date.split("-").reverse().join("/")}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(Number(inv.service_value))}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={inv.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Primary action button */}
                            {inv.status === "draft" && canEmit && (
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
                            {(inv.status === "rejected" || inv.status === "error") && (
                              <Button
                                size="icon"
                                variant="default"
                                className="h-7 w-7"
                                disabled={resending === inv.id}
                                title="Reenviar"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmResend(inv.id);
                                }}
                              >
                                {resending === inv.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3 w-3" />
                                )}
                              </Button>
                            )}

                            {/* 3-dot dropdown menu */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={() => navigate(`/invoices/${inv.id}`)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                {inv.status === "authorized" && (
                                  <DropdownMenuItem onClick={async () => {
                                    // Substitute: cancel old note, create new editable one
                                    const confirmed = window.confirm("Deseja substituir esta nota? A nota atual será cancelada e uma nova será criada com os mesmos dados para edição.");
                                    if (!confirmed) return;
                                    // Cancel original
                                    try {
                                      await supabase.functions.invoke("query-nfse", {
                                        body: { action: "cancel", invoice_id: inv.id, reason: "Substituição de NFS-e" },
                                      });
                                    } catch { /* continue even if cancel fails */ }
                                    // Create new invoice as draft with same data
                                    const { data: original } = await supabase
                                      .from("nfse_invoices")
                                      .select("*")
                                      .eq("id", inv.id)
                                      .single();
                                    if (original) {
                                      const { id: _id, invoice_number: _in, rps_number: _rn, status: _s, protocol_number: _p, batch_number: _b, verification_code: _v, xml_rps: _xr, xml_signed: _xs, xml_response: _xresp, xml_authorized: _xa, danfse_path: _dp, issued_at: _ia, created_at: _ca, updated_at: _ua, metadata: _m, ...rest } = original as any;
                                      const { data: newInv } = await supabase
                                        .from("nfse_invoices")
                                        .insert({ ...rest, status: "draft" as any, replaced_invoice_id: inv.id })
                                        .select("id")
                                        .single();
                                      if (newInv) {
                                        toast.success("Nova nota criada para edição");
                                        navigate(`/invoices/${newInv.id}`);
                                        return;
                                      }
                                    }
                                    toast.error("Erro ao criar nota substituta");
                                    await fetchInvoices();
                                  }}>
                                    <ArrowUpDown className="h-4 w-4 mr-2" />
                                    Substituir
                                  </DropdownMenuItem>
                                )}
                                {inv.status === "authorized" && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive"
                                      disabled={cancelling === inv.id}
                                      onClick={() => { setCancelReason(""); setCancelDetailsOpen(false); setConfirmCancel(inv as unknown as Invoice); }}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Cancelar NFS-e
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={async () => {
                                  if (inv.status !== "authorized" && inv.status !== "cancelled") {
                                    toast.info("XML disponível apenas para notas autorizadas ou canceladas");
                                    return;
                                  }
                                  // Fetch full invoice data for XML
                                  const { data: full } = await supabase
                                    .from("nfse_invoices")
                                    .select("xml_authorized, xml_signed, xml_rps")
                                    .eq("id", inv.id)
                                    .single();
                                  const xml = full?.xml_authorized || full?.xml_signed || full?.xml_rps;
                                  if (!xml) {
                                    toast.error("XML não disponível para esta nota");
                                    return;
                                  }
                                  const blob = new Blob([xml], { type: "application/xml" });
                                  const url = URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = url;
                                  a.download = `nfse_${inv.invoice_number || inv.rps_number || inv.id}.xml`;
                                  a.click();
                                  URL.revokeObjectURL(url);
                                }}>
                                  <Code className="h-4 w-4 mr-2" />
                                  Download XML
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async () => {
                                  if (inv.status !== "authorized" && inv.status !== "cancelled") {
                                    toast.info("DANFS-e disponível apenas para notas autorizadas");
                                    return;
                                  }
                                  // Check if danfse_path exists
                                  const { data: full } = await supabase
                                    .from("nfse_invoices")
                                    .select("danfse_path, xml_authorized")
                                    .eq("id", inv.id)
                                    .single();
                                  if (full?.danfse_path) {
                                    const { data: fileData } = await supabase.storage.from("certificates").download(full.danfse_path);
                                    if (fileData) {
                                      const url = URL.createObjectURL(fileData);
                                      const a = document.createElement("a");
                                      a.href = url;
                                      a.download = `danfse_${inv.invoice_number || inv.id}.pdf`;
                                      a.click();
                                      URL.revokeObjectURL(url);
                                      return;
                                    }
                                  }
                                  // Fallback: generate simple DANFS-e from XML
                                  if (full?.xml_authorized) {
                                    const blob = new Blob([full.xml_authorized], { type: "application/xml" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `danfse_${inv.invoice_number || inv.id}.xml`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                    toast.info("DANFS-e em PDF não disponível, XML autorizado baixado como alternativa");
                                  } else {
                                    toast.error("DANFS-e não disponível para esta nota");
                                  }
                                }}>
                                  <FileText className="h-4 w-4 mr-2" />
                                  Download DANFS-e
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEventLog(inv)}>
                                  <AlertTriangle className="h-4 w-4 mr-2" />
                                  Ver Log de Eventos
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
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

      {/* Cancel Modal */}
      <Dialog open={!!confirmCancel} onOpenChange={(open) => { if (!open) setConfirmCancel(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-destructive">
              CANCELAMENTO DE NFS-E
            </DialogTitle>
          </DialogHeader>
          <div className="border-t border-destructive/30 mb-2" />

          {confirmCancel && (
            <div className="space-y-4">
              {/* Chave de acesso */}
              <div>
                <Label className="text-sm font-medium">Chave de acesso</Label>
                <div className="mt-1 rounded-md border bg-muted/50 p-3 font-mono text-sm break-all">
                  {(confirmCancel as any).metadata?.chave_acesso || "Não disponível"}
                </div>
              </div>

              {/* Expandable details */}
              <Collapsible open={cancelDetailsOpen} onOpenChange={setCancelDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="link" size="sm" className="h-auto p-0 text-primary">
                    {cancelDetailsOpen ? (
                      <><ChevronUp className="h-3 w-3 mr-1" /> Ocultar detalhes da NFS-e</>
                    ) : (
                      <><ChevronDown className="h-3 w-3 mr-1" /> Exibir detalhes da NFS-e</>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2 rounded-md border p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tomador:</span>
                    <span className="font-medium">{confirmCancel.taker_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor:</span>
                    <span className="font-medium">{Number(confirmCancel.service_value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Competência:</span>
                    <span className="font-medium">{confirmCancel.competence_date.split("-").reverse().join("/")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Empresa:</span>
                    <span className="font-medium">{confirmCancel.companies?.legal_name || "—"}</span>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              {/* Reason select */}
              <div>
                <Label className="text-sm font-medium">
                  Motivo do cancelamento <span className="text-destructive">*</span>
                </Label>
                <Select value={cancelReason} onValueChange={setCancelReason}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Erro na emissão">Erro na emissão</SelectItem>
                    <SelectItem value="Serviço não prestado">Serviço não prestado</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  disabled={!cancelReason || cancelling === confirmCancel.id}
                  onClick={() => handleCancel(confirmCancel.id, cancelReason)}
                >
                  {cancelling === confirmCancel.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Cancelar NFS-e
                </Button>
                <Button variant="secondary" onClick={() => setConfirmCancel(null)}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Resend Dialog */}
      <AlertDialog open={!!confirmResend} onOpenChange={() => setConfirmResend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reenviar Nota Fiscal</AlertDialogTitle>
            <AlertDialogDescription>
              A nota será reenviada com os mesmos dados ao portal nacional da NFS-e. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmResend && handleResend(confirmResend)}>
              Reenviar NFS-e
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Event Log Dialog */}
      <Dialog open={!!eventLogInvoice} onOpenChange={(open) => !open && setEventLogInvoice(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Log de Eventos — {eventLogInvoice?.taker_name || "Nota"}
            </DialogTitle>
          </DialogHeader>

          {loadingEvents ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento registrado.</p>
          ) : (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="relative pl-6">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

                <div className="space-y-4">
                  {events.map((evt) => {
                    const config = EVENT_TYPE_CONFIG[evt.event_type] || { label: evt.event_type, icon: Info, color: "text-muted-foreground" };
                    const Icon = config.icon;
                    const isError = evt.event_type === "rejected" || evt.event_type === "error";
                    const isExpanded = expandedEvent === evt.id;
                    const hasDetails = evt.error_message || evt.response_xml || evt.request_xml;

                    return (
                      <div key={evt.id} className="relative">
                        {/* Timeline dot */}
                        <div className={`absolute -left-6 top-1 h-5 w-5 rounded-full border-2 border-background flex items-center justify-center ${isError ? "bg-destructive/10" : "bg-muted"}`}>
                          <Icon className={`h-3 w-3 ${config.color}`} />
                        </div>

                        <div className={`rounded-lg border p-3 ${isError ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={isError ? "destructive" : "secondary"} className="text-xs">
                                {config.label}
                              </Badge>
                              {evt.error_code && (
                                <Badge variant="outline" className="text-xs font-mono">
                                  HTTP {evt.error_code}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(evt.created_at).toLocaleString("pt-BR")}
                            </span>
                          </div>

                          {evt.description && (
                            <p className="text-sm mt-2 text-foreground">{evt.description}</p>
                          )}

                          {evt.error_message && (
                            <div className="mt-2 rounded bg-destructive/10 border border-destructive/20 p-2">
                              <p className="text-xs font-semibold text-destructive mb-1">Motivo da Rejeição:</p>
                              <pre className="text-xs text-destructive/90 whitespace-pre-wrap font-mono break-all">
                                {evt.error_message}
                              </pre>
                            </div>
                          )}

                          {hasDetails && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs mt-2 px-1"
                              onClick={() => setExpandedEvent(isExpanded ? null : evt.id)}
                            >
                              {isExpanded ? (
                                <><ChevronUp className="h-3 w-3 mr-1" /> Ocultar detalhes</>
                              ) : (
                                <><ChevronDown className="h-3 w-3 mr-1" /> Ver detalhes</>
                              )}
                            </Button>
                          )}

                          {isExpanded && (
                            <div className="mt-2 space-y-2">
                              {evt.response_xml && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">Resposta SEFIN:</p>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono break-all max-h-40">
                                    {evt.response_xml}
                                  </pre>
                                </div>
                              )}
                              {evt.request_xml && (
                                <div>
                                  <p className="text-xs font-semibold text-muted-foreground mb-1">XML Enviado:</p>
                                  <pre className="text-xs bg-muted rounded p-2 overflow-x-auto whitespace-pre-wrap font-mono break-all max-h-40">
                                    {evt.request_xml}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
