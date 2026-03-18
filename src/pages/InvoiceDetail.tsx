import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText, FileCode, Clock, Building2, User, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface InvoiceDetail {
  id: string;
  rps_number: number | null;
  rps_series: string | null;
  invoice_number: number | null;
  status: string;
  competence_date: string;
  issued_at: string | null;
  created_at: string;
  taker_name: string;
  taker_document: string;
  taker_email: string | null;
  taker_phone: string | null;
  taker_address_street: string | null;
  taker_address_number: string | null;
  taker_address_city: string | null;
  taker_address_state: string | null;
  taker_address_zip: string | null;
  service_description: string;
  service_value: number;
  tax_code: string;
  cnae_code: string | null;
  iss_rate: number | null;
  iss_value: number | null;
  iss_retained: boolean | null;
  pis_value: number | null;
  cofins_value: number | null;
  inss_value: number | null;
  ir_value: number | null;
  csll_value: number | null;
  net_value: number | null;
  deduction_value: number | null;
  discount_value: number | null;
  base_value: number | null;
  verification_code: string | null;
  protocol_number: string | null;
  batch_number: string | null;
  xml_rps: string | null;
  xml_signed: string | null;
  xml_response: string | null;
  xml_authorized: string | null;
  notes: string | null;
  companies: { legal_name: string; document: string } | null;
}

interface NfseEvent {
  id: string;
  event_type: string;
  description: string | null;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  request_xml: string | null;
  response_xml: string | null;
}

const eventLabels: Record<string, string> = {
  created: "Criada",
  xml_generated: "XML Gerado",
  xml_signed: "XML Assinado",
  submitted: "Enviada",
  protocol_received: "Protocolo Recebido",
  batch_queried: "Lote Consultado",
  authorized: "Autorizada",
  rejected: "Rejeitada",
  cancelled: "Cancelada",
  substituted: "Substituída",
  error: "Erro",
};

function XmlViewer({ xml, label }: { xml: string | null; label: string }) {
  const [copied, setCopied] = useState(false);

  if (!xml) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <FileCode className="h-10 w-10 mb-2 opacity-40" />
        <p className="text-sm">{label} não disponível</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(xml);
    setCopied(true);
    toast.success("XML copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="ghost"
        className="absolute top-2 right-2 h-7 text-xs z-10"
        onClick={handleCopy}
      >
        {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
        {copied ? "Copiado" : "Copiar"}
      </Button>
      <ScrollArea className="h-[400px] rounded-md border bg-muted/30 p-4">
        <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground/80">
          {xml}
        </pre>
      </ScrollArea>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">
        {value || "—"}
      </span>
    </div>
  );
}

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { tenant } = useTenant();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [events, setEvents] = useState<NfseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenant || !id) return;

    const fetchData = async () => {
      const [invoiceRes, eventsRes] = await Promise.all([
        supabase
          .from("nfse_invoices")
          .select("*, companies(legal_name, document)")
          .eq("id", id)
          .eq("tenant_id", tenant.id)
          .single(),
        supabase
          .from("nfse_events")
          .select("*")
          .eq("invoice_id", id)
          .eq("tenant_id", tenant.id)
          .order("created_at", { ascending: true }),
      ]);

      if (invoiceRes.data) setInvoice(invoiceRes.data as unknown as InvoiceDetail);
      if (eventsRes.data) setEvents(eventsRes.data as unknown as NfseEvent[]);
      setLoading(false);
    };

    fetchData();
  }, [tenant, id]);

  const fmt = (v: number | null | undefined) =>
    v != null
      ? Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : "—";

  const fmtDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString("pt-BR") : "—";

  const fmtDateTime = (d: string | null | undefined) =>
    d
      ? new Date(d).toLocaleString("pt-BR", {
          dateStyle: "short",
          timeStyle: "medium",
        })
      : "—";

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-muted-foreground">Nota fiscal não encontrada</p>
          <Link to="/invoices" className="mt-4">
            <Button variant="outline" size="sm">Voltar</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="animate-fade-in space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link to="/invoices">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">
                  NFS-e {invoice.invoice_number ? `#${invoice.invoice_number}` : `RPS ${invoice.rps_number || "—"}`}
                </h1>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Criada em {fmtDateTime(invoice.created_at)}
              </p>
            </div>
          </div>
          {(invoice.status === "draft" || invoice.status === "rejected") && (
            <Link to={`/invoices/${invoice.id}`}>
              <Button variant="outline" size="sm">Editar</Button>
            </Link>
          )}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" /> Empresa Emissora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-sm">{invoice.companies?.legal_name || "—"}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {invoice.companies?.document || "—"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Tomador
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-sm">{invoice.taker_name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {invoice.taker_document}
              </p>
              {invoice.taker_email && (
                <p className="text-xs text-muted-foreground mt-1">{invoice.taker_email}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Valores
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{fmt(invoice.service_value)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Líquido: {fmt(invoice.net_value)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="details">Dados da Nota</TabsTrigger>
            <TabsTrigger value="xml">XML DPS</TabsTrigger>
            <TabsTrigger value="xml-signed">XML Assinado</TabsTrigger>
            <TabsTrigger value="xml-response">XML Resposta</TabsTrigger>
            <TabsTrigger value="xml-authorized">XML Autorizado</TabsTrigger>
            <TabsTrigger value="events">
              Eventos ({events.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Identificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoRow label="Nº NFS-e" value={invoice.invoice_number?.toString()} />
                  <InfoRow label="Nº RPS" value={invoice.rps_number?.toString()} />
                  <InfoRow label="Série RPS" value={invoice.rps_series} />
                  <InfoRow label="Competência" value={fmtDate(invoice.competence_date)} />
                  <InfoRow label="Data Emissão" value={fmtDateTime(invoice.issued_at)} />
                  <InfoRow label="Código Verificação" value={invoice.verification_code} />
                  <InfoRow label="Nº Protocolo" value={invoice.protocol_number} />
                  <InfoRow label="Nº Lote" value={invoice.batch_number} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Serviço</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoRow label="Código Tributação" value={invoice.tax_code} />
                  <InfoRow label="CNAE" value={invoice.cnae_code} />
                  <InfoRow label="ISS Retido" value={invoice.iss_retained ? "Sim" : "Não"} />
                  <InfoRow label="Alíquota ISS" value={invoice.iss_rate != null ? `${Number(invoice.iss_rate)}%` : null} />
                  <div className="pt-2">
                    <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                    <p className="text-sm">{invoice.service_description || "—"}</p>
                  </div>
                  {invoice.notes && (
                    <div className="pt-2">
                      <p className="text-sm text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm">{invoice.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tomador</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoRow label="Nome" value={invoice.taker_name} />
                  <InfoRow label="Documento" value={invoice.taker_document} />
                  <InfoRow label="E-mail" value={invoice.taker_email} />
                  <InfoRow label="Telefone" value={invoice.taker_phone} />
                  <InfoRow label="Endereço" value={
                    [invoice.taker_address_street, invoice.taker_address_number].filter(Boolean).join(", ") || null
                  } />
                  <InfoRow label="Cidade/UF" value={
                    [invoice.taker_address_city, invoice.taker_address_state].filter(Boolean).join("/") || null
                  } />
                  <InfoRow label="CEP" value={invoice.taker_address_zip} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tributos e Retenções</CardTitle>
                </CardHeader>
                <CardContent className="space-y-0">
                  <InfoRow label="Valor Serviço" value={fmt(invoice.service_value)} />
                  <InfoRow label="Deduções" value={fmt(invoice.deduction_value)} />
                  <InfoRow label="Descontos" value={fmt(invoice.discount_value)} />
                  <InfoRow label="Base de Cálculo" value={fmt(invoice.base_value)} />
                  <InfoRow label="ISS" value={fmt(invoice.iss_value)} />
                  <InfoRow label="PIS" value={fmt(invoice.pis_value)} />
                  <InfoRow label="COFINS" value={fmt(invoice.cofins_value)} />
                  <InfoRow label="INSS" value={fmt(invoice.inss_value)} />
                  <InfoRow label="IR" value={fmt(invoice.ir_value)} />
                  <InfoRow label="CSLL" value={fmt(invoice.csll_value)} />
                  <InfoRow label="Valor Líquido" value={fmt(invoice.net_value)} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="xml">
            <Card>
              <CardContent className="pt-6">
                <XmlViewer xml={invoice.xml_rps} label="XML DPS (RPS)" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="xml-signed">
            <Card>
              <CardContent className="pt-6">
                <XmlViewer xml={invoice.xml_signed} label="XML Assinado" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="xml-response">
            <Card>
              <CardContent className="pt-6">
                <XmlViewer xml={invoice.xml_response} label="XML de Resposta" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="xml-authorized">
            <Card>
              <CardContent className="pt-6">
                <XmlViewer xml={invoice.xml_authorized} label="XML Autorizado" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <Card>
              <CardContent className="pt-6">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Clock className="h-10 w-10 mb-2 opacity-40" />
                    <p className="text-sm">Nenhum evento registrado</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                    <div className="space-y-6">
                      {events.map((event) => (
                        <div key={event.id} className="relative pl-10">
                          <div className="absolute left-2.5 top-1 h-3 w-3 rounded-full border-2 border-primary bg-background" />
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">
                                {eventLabels[event.event_type] || event.event_type}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {fmtDateTime(event.created_at)}
                              </span>
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                            )}
                            {event.error_message && (
                              <p className="text-sm text-destructive mt-1">
                                {event.error_code && <span className="font-mono mr-1">[{event.error_code}]</span>}
                                {event.error_message}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
