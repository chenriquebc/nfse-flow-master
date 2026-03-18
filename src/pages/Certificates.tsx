import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, ShieldCheck, Upload, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Certificate {
  id: string;
  company_id: string;
  file_name: string;
  serial_number: string | null;
  subject: string | null;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  created_at: string;
  companies: { legal_name: string } | null;
}

interface Company {
  id: string;
  legal_name: string;
}

export default function Certificates() {
  const { tenant } = useTenant();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [companyId, setCompanyId] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const fetchCerts = async () => {
    if (!tenant) return;
    const { data } = await supabase
      .from("certificates")
      .select("*, companies(legal_name)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false });
    setCertificates((data as unknown as Certificate[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!tenant) return;
    fetchCerts();
    supabase
      .from("companies")
      .select("id, legal_name")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("legal_name")
      .then(({ data }) => setCompanies((data as Company[]) || []));
  }, [tenant]);

  const handleUpload = async () => {
    if (!tenant || !file || !companyId) {
      toast.error("Selecione empresa e arquivo");
      return;
    }
    if (!password) {
      toast.error("Informe a senha do certificado");
      return;
    }

    setUploading(true);

    // 1. Parse certificate and encrypt password server-side
    const formData = new FormData();
    formData.append("file", file);
    formData.append("password", password);

    const { data: certData, error: parseError } = await supabase.functions.invoke(
      "parse-certificate",
      { body: formData }
    );

    if (parseError || certData?.error) {
      toast.error("Erro ao processar certificado", {
        description: certData?.error || parseError?.message,
      });
      setUploading(false);
      return;
    }

    // 2. Upload file to storage
    const filePath = `${tenant.id}/${companyId}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("certificates")
      .upload(filePath, file);

    if (uploadError) {
      toast.error("Erro no upload", { description: uploadError.message });
      setUploading(false);
      return;
    }

    // 3. Save cert record with encrypted password and parsed metadata
    const { error } = await supabase.from("certificates").insert({
      tenant_id: tenant.id,
      company_id: companyId,
      file_name: file.name,
      file_path: filePath,
      password_encrypted: certData.password_encrypted,
      serial_number: certData.serial_number || null,
      subject: certData.subject || null,
      issuer: certData.issuer || null,
      valid_from: certData.valid_from || null,
      valid_until: certData.valid_until || null,
      is_active: true,
    });

    if (error) {
      toast.error("Erro ao salvar certificado", { description: error.message });
    } else {
      toast.success("Certificado enviado com sucesso!");
      setOpen(false);
      setFile(null);
      setPassword("");
      setCompanyId("");
      fetchCerts();
    }
    setUploading(false);
  };

  const handleDelete = async (id: string, filePath: string) => {
    await supabase.storage.from("certificates").remove([filePath]);
    await supabase.from("certificates").delete().eq("id", id);
    toast.success("Certificado removido");
    fetchCerts();
  };

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  const isExpiringSoon = (date: string | null) => {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 page-header">
          <div>
            <h1 className="page-title">Certificados Digitais</h1>
            <p className="page-description">Gerencie os certificados A1 das empresas</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Certificado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload de Certificado A1</DialogTitle>
                <DialogDescription>
                  Envie o arquivo .pfx e informe a senha do certificado
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.legal_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Arquivo do certificado (.pfx)</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pfx,.p12"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                    />
                  </div>
                  {file && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Upload className="h-3 w-3" />
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Senha do certificado</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Senha do .pfx"
                  />
                </div>
                <Button onClick={handleUpload} disabled={uploading} className="w-full">
                  {uploading ? "Enviando..." : "Enviar Certificado"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : certificates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhum certificado cadastrado</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar certificado
                </Button>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-x-auto">
                <Table className="min-w-[540px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Arquivo</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">
                          {cert.companies?.legal_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm font-mono">{cert.file_name}</TableCell>
                        <TableCell className="text-sm">
                          {cert.valid_until
                            ? new Date(cert.valid_until).toLocaleDateString("pt-BR")
                            : "Não informado"}
                        </TableCell>
                        <TableCell>
                          {isExpired(cert.valid_until) ? (
                            <span className="status-badge status-rejected flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Vencido
                            </span>
                          ) : isExpiringSoon(cert.valid_until) ? (
                            <span className="status-badge status-processing flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Vence em breve
                            </span>
                          ) : (
                            <span className="status-badge status-authorized flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Válido
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(cert.id, cert.file_name)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
    </AppLayout>
  );
}
