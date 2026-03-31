import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, ArrowRight, Send, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import InvoiceWizardStepper from "@/components/invoice/InvoiceWizardStepper";
import StepEmpresa from "@/components/invoice/StepEmpresa";
import StepTomador from "@/components/invoice/StepTomador";
import StepServico from "@/components/invoice/StepServico";
import StepValores from "@/components/invoice/StepValores";
import StepRevisao from "@/components/invoice/StepRevisao";

interface Company {
  id: string;
  legal_name: string;
}

const STEPS = [
  { label: "Empresa", description: "Selecione a empresa emitente" },
  { label: "Tomador", description: "Dados de quem contrata o serviço" },
  { label: "Serviço", description: "Descrição e códigos fiscais" },
  { label: "Valores", description: "Valores e tributos" },
  { label: "Revisão", description: "Confira os dados antes de salvar" },
];

const INVOICE_DRAFT_STORAGE_KEY = "nfse_invoice_new_draft_v1";

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const { permissions } = useUserPermissions();
  const { subscribed, loading: subLoading } = useSubscription();
  const canEmit = permissions.isAdmin || permissions.can_emit_invoices;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [draftHydrated, setDraftHydrated] = useState(isEditing);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const [form, setForm] = useState({
    company_id: "",
    competence_date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(),
    tax_assessment_regime: "1",
    taker_document: "",
    taker_name: "",
    taker_email: "",
    taker_phone: "",
    taker_address_street: "",
    taker_address_number: "",
    taker_address_city: "",
    taker_address_city_code: "",
    taker_address_state: "",
    taker_address_zip: "",
    taker_location: "brasil",
    intermediary_type: "none",
    intermediary_document: "",
    intermediary_name: "",
    intermediary_city: "",
    intermediary_city_code: "",
    intermediary_state: "",
    service_country: "1058",
    service_city_code: "",
    service_description: "",
    tax_code: "",
    nbs_code: "",
    municipal_tax_code: "",
    issqn_exemption: false,
    issqn_city: "",
    service_value: "",
    intermediary_value: "0",
    unconditional_discount: "0",
    conditional_discount: "0",
    deduction_value: "0",
    discount_value: "0",
    iss_rate: "5",
    iss_retained: false,
    issqn_taxation: "tributavel",
    special_tax_regime: "nenhum",
    issqn_suspended: false,
    issqn_retained_by_taker: false,
    municipal_benefit: false,
    pis_cofins_situation: "",
    pis_cofins_csll_retention_type: "",
    irrf_value: "0",
    social_contributions_retained: "0",
    social_security_retained: "0",
    approx_tax_mode: "simples_nacional",
    simples_nacional_rate: "6",
    pis_value: "0",
    cofins_value: "0",
    inss_value: "0",
    ir_value: "0",
    csll_value: "0",
    notes: "",
  });

  // Track if user has made changes
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string>("");
  useEffect(() => {
    if (!initialFormSnapshot && draftHydrated) {
      setInitialFormSnapshot(JSON.stringify(form));
    }
  }, [draftHydrated]);

  const hasChanges = useMemo(() => {
    if (!initialFormSnapshot) return false;
    return JSON.stringify(form) !== initialFormSnapshot;
  }, [form, initialFormSnapshot]);

  // Block navigation via router (sidebar links, etc.)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      hasChanges && currentLocation.pathname !== nextLocation.pathname
  );

  useEffect(() => {
    if (blocker.state === "blocked") {
      setShowExitDialog(true);
      setPendingNavigation(() => () => blocker.proceed());
    }
  }, [blocker.state]);

  useEffect(() => {
    if (isEditing) return;

    try {
      const rawDraft = sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY);
      if (!rawDraft) return;

      const parsed = JSON.parse(rawDraft) as {
        form?: Partial<typeof form>;
        currentStep?: number;
      };

      if (parsed.form && typeof parsed.form === "object") {
        setForm((prev) => ({ ...prev, ...parsed.form }));
      }

      if (Number.isInteger(parsed.currentStep)) {
        const restoredStep = Math.min(
          Math.max(Number(parsed.currentStep), 0),
          STEPS.length - 1,
        );
        setCurrentStep(restoredStep);
      }
    } catch {
      sessionStorage.removeItem(INVOICE_DRAFT_STORAGE_KEY);
    } finally {
      setDraftHydrated(true);
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing || !draftHydrated) return;

    sessionStorage.setItem(
      INVOICE_DRAFT_STORAGE_KEY,
      JSON.stringify({ form, currentStep }),
    );
  }, [isEditing, draftHydrated, form, currentStep]);

  useEffect(() => {
    if (!tenant) return;
    supabase
      .from("companies")
      .select("id, legal_name")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("legal_name")
      .then(({ data }) => setCompanies((data as Company[]) || []));
  }, [tenant]);

  // Load existing invoice for editing
  useEffect(() => {
    if (!id || !tenant) return;
    setLoadingInvoice(true);
    supabase
      .from("nfse_invoices")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          toast.error("Nota não encontrada");
          navigate("/invoices");
          return;
        }
        setForm({
          company_id: data.company_id || "",
          competence_date: data.competence_date || (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(),
          tax_assessment_regime: (data as any).tax_assessment_regime || "1",
          taker_document: data.taker_document || "",
          taker_name: data.taker_name || "",
          taker_email: data.taker_email || "",
          taker_phone: data.taker_phone || "",
          taker_address_street: data.taker_address_street || "",
          taker_address_number: data.taker_address_number || "",
          taker_address_city: data.taker_address_city || "",
          taker_address_city_code: data.taker_address_city_code || "",
          taker_address_state: data.taker_address_state || "",
          taker_address_zip: data.taker_address_zip || "",
          taker_location: data.taker_document ? "brasil" : "nao_informado",
          intermediary_type: (data as any).intermediary_type || "none",
          intermediary_document: (data as any).intermediary_document || "",
          intermediary_name: (data as any).intermediary_name || "",
          intermediary_city: (data as any).intermediary_city || "",
          intermediary_city_code: (data as any).intermediary_city_code || "",
          intermediary_state: (data as any).intermediary_state || "",
          service_country: (data as any).service_country || "1058",
          service_city_code: (data as any).service_city_code || "",
          service_description: data.service_description || "",
          tax_code: data.tax_code || "",
          nbs_code: data.nbs_code || "",
          municipal_tax_code: (data as any).municipal_tax_code || "",
          issqn_exemption: (data as any).issqn_exemption || false,
          issqn_city: (data as any).issqn_city || "",
          service_value: String(data.service_value || ""),
          intermediary_value: String((data as any).intermediary_value || 0),
          unconditional_discount: String((data as any).unconditional_discount || 0),
          conditional_discount: String((data as any).conditional_discount || 0),
          deduction_value: String(data.deduction_value || 0),
          discount_value: String(data.discount_value || 0),
          iss_rate: String((data.iss_rate || 0) * 100),
          iss_retained: data.iss_retained || false,
          issqn_taxation: (data as any).issqn_taxation || "tributavel",
          special_tax_regime: (data as any).special_tax_regime || "nenhum",
          issqn_suspended: (data as any).issqn_suspended || false,
          issqn_retained_by_taker: (data as any).issqn_retained_by_taker || false,
          municipal_benefit: (data as any).municipal_benefit || false,
          pis_cofins_situation: (data as any).pis_cofins_situation || "",
          pis_cofins_csll_retention_type: (data as any).pis_cofins_csll_retention_type || "",
          irrf_value: String((data as any).irrf_value || 0),
          social_contributions_retained: String((data as any).social_contributions_retained || 0),
          social_security_retained: String((data as any).social_security_retained || 0),
          approx_tax_mode: (data as any).approx_tax_mode || "simples_nacional",
          simples_nacional_rate: String((data as any).simples_nacional_rate || 6),
          pis_value: String(data.pis_value || 0),
          cofins_value: String(data.cofins_value || 0),
          inss_value: String(data.inss_value || 0),
          ir_value: String(data.ir_value || 0),
          csll_value: String(data.csll_value || 0),
          notes: data.notes || "",
        });
        setLoadingInvoice(false);
      });
  }, [id, tenant]);

  const set = (key: string, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  // Computed values
  const serviceValue = parseFloat(form.service_value) || 0;
  const deductionValue = parseFloat(form.deduction_value) || 0;
  const discountValue = parseFloat(form.discount_value) || 0;
  const issRate = parseFloat(form.iss_rate) || 0;
  const baseValue = serviceValue - deductionValue;
  const issValue = baseValue * (issRate / 100);
  const totalDeductions =
    (parseFloat(form.pis_value) || 0) +
    (parseFloat(form.cofins_value) || 0) +
    (parseFloat(form.inss_value) || 0) +
    (parseFloat(form.ir_value) || 0) +
    (parseFloat(form.csll_value) || 0) +
    (form.iss_retained ? issValue : 0);
  const netValue = serviceValue - discountValue - totalDeductions;

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Step validation
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0:
        if (!form.company_id) { toast.error("Selecione uma empresa"); return false; }
        return true;
      case 1:
        if (form.taker_location !== "nao_informado") {
          if (!form.taker_document.trim()) { toast.error("Informe o CPF/CNPJ do tomador"); return false; }
          if (!form.taker_name.trim()) { toast.error("Informe o nome do tomador"); return false; }
        }
        return true;
      case 2:
        if (!form.service_description.trim()) { toast.error("Descreva o serviço"); return false; }
        if (!form.tax_code.trim()) { toast.error("Informe o código de tributação"); return false; }
        if (!form.nbs_code.trim()) { toast.error("Informe o código NBS"); return false; }
        return true;
      case 3:
        if (serviceValue <= 0) { toast.error("Informe o valor do serviço"); return false; }
        return true;
      default:
        return true;
    }
  };

  const goNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(s + 1, STEPS.length - 1));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const goBack = () => {
    setCurrentStep((s) => Math.max(s - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const [emitting, setEmitting] = useState(false);

  const buildPayload = () => ({
    tenant_id: tenant!.id,
    company_id: form.company_id,
    competence_date: form.competence_date,
    tax_assessment_regime: form.tax_assessment_regime,
    taker_document: form.taker_location === "nao_informado" ? "" : form.taker_document,
    taker_name: form.taker_location === "nao_informado" ? "" : form.taker_name,
    taker_email: form.taker_email || null,
    taker_phone: form.taker_phone || null,
    taker_address_street: form.taker_address_street || null,
    taker_address_number: form.taker_address_number || null,
    taker_address_city: form.taker_address_city || null,
    taker_address_city_code: form.taker_address_city_code || null,
    taker_address_state: form.taker_address_state || null,
    taker_address_zip: form.taker_address_zip || null,
    intermediary_type: form.intermediary_type,
    intermediary_document: form.intermediary_document || null,
    intermediary_name: form.intermediary_name || null,
    intermediary_city: form.intermediary_city || null,
    intermediary_city_code: form.intermediary_city_code || null,
    intermediary_state: form.intermediary_state || null,
    service_description: form.service_description,
    tax_code: form.tax_code,
    nbs_code: form.nbs_code || null,
    cnae_code: form.municipal_tax_code || null,
    municipal_tax_code: form.municipal_tax_code || null,
    issqn_exemption: form.issqn_exemption,
    issqn_city: form.issqn_city || null,
    service_value: serviceValue,
    intermediary_value: parseFloat(form.intermediary_value) || 0,
    unconditional_discount: parseFloat(form.unconditional_discount) || 0,
    conditional_discount: parseFloat(form.conditional_discount) || 0,
    deduction_value: deductionValue,
    discount_value: discountValue,
    base_value: baseValue,
    iss_rate: issRate / 100,
    iss_value: issValue,
    iss_retained: form.iss_retained,
    issqn_taxation: form.issqn_taxation,
    special_tax_regime: form.special_tax_regime,
    issqn_suspended: form.issqn_suspended,
    issqn_retained_by_taker: form.issqn_retained_by_taker,
    municipal_benefit: form.municipal_benefit,
    pis_cofins_situation: form.pis_cofins_situation || null,
    pis_cofins_csll_retention_type: form.pis_cofins_csll_retention_type || null,
    irrf_value: parseFloat(form.irrf_value) || 0,
    social_contributions_retained: parseFloat(form.social_contributions_retained) || 0,
    social_security_retained: parseFloat(form.social_security_retained) || 0,
    approx_tax_mode: form.approx_tax_mode,
    simples_nacional_rate: parseFloat(form.simples_nacional_rate) || 0,
    pis_value: parseFloat(form.pis_value) || 0,
    cofins_value: parseFloat(form.cofins_value) || 0,
    inss_value: parseFloat(form.inss_value) || 0,
    ir_value: parseFloat(form.ir_value) || 0,
    csll_value: parseFloat(form.csll_value) || 0,
    net_value: netValue,
    notes: form.notes || null,
    status: "draft" as const,
    created_by: user!.id,
  });

  const handleSubmit = async () => {
    if (!tenant || !user) return;
    setLoading(true);
    const payload = buildPayload();
    let error;
    if (isEditing) {
      ({ error } = await supabase.from("nfse_invoices").update(payload).eq("id", id!));
    } else {
      ({ error } = await supabase.from("nfse_invoices").insert(payload));
    }
    if (error) {
      toast.error("Erro ao salvar nota", { description: error.message });
    } else {
      if (!isEditing) sessionStorage.removeItem(INVOICE_DRAFT_STORAGE_KEY);
      toast.success(isEditing ? "Nota fiscal atualizada!" : "Nota fiscal criada como rascunho!");
      navigate("/invoices");
    }
    setLoading(false);
  };

  const handleSaveAndEmit = async () => {
    if (!tenant || !user) return;
    setEmitting(true);
    const payload = buildPayload();
    let invoiceId = id;
    let error;
    if (isEditing) {
      ({ error } = await supabase.from("nfse_invoices").update(payload).eq("id", id!));
    } else {
      const { data: inserted, error: insertErr } = await supabase.from("nfse_invoices").insert(payload).select("id").single();
      error = insertErr;
      if (inserted) invoiceId = inserted.id;
    }
    if (error || !invoiceId) {
      toast.error("Erro ao salvar nota", { description: error?.message });
      setEmitting(false);
      return;
    }

    if (!isEditing) sessionStorage.removeItem(INVOICE_DRAFT_STORAGE_KEY);

    try {
      const { data: emitData, error: emitError } = await supabase.functions.invoke("emit-nfse", {
        body: { invoice_id: invoiceId },
      });
      if (emitError) throw emitError;
      if (emitData?.error || emitData?.error_message || emitData?.success === false) {
        const msg = emitData?.error_message || emitData?.error || "Erro desconhecido na emissão";
        toast.error("Nota salva, mas rejeitada pela SEFIN", { description: typeof msg === "string" ? msg.slice(0, 200) : "Verifique os detalhes na listagem" });
        navigate("/invoices");
        setEmitting(false);
        return;
      }
      toast.success("Nota fiscal emitida com sucesso!");
      navigate("/invoices");
    } catch (err: any) {
      toast.error("Nota salva, mas erro ao emitir", { description: err.message });
      navigate("/invoices");
    }
    setEmitting(false);
  };

  const handleExitClick = () => {
    if (hasChanges) {
      setShowExitDialog(true);
      setPendingNavigation(() => () => navigate("/invoices"));
    } else {
      navigate("/invoices");
    }
  };

  const handleSaveDraft = () => {
    // sessionStorage already has the draft from the persist effect
    setShowExitDialog(false);
    if (pendingNavigation) pendingNavigation();
    else navigate("/invoices");
  };

  const handleDiscard = () => {
    sessionStorage.removeItem(INVOICE_DRAFT_STORAGE_KEY);
    setShowExitDialog(false);
    if (blocker.state === "blocked") blocker.proceed();
    else if (pendingNavigation) pendingNavigation();
    else navigate("/invoices");
  };

  const handleCancelDialog = () => {
    setShowExitDialog(false);
    setPendingNavigation(null);
    if (blocker.state === "blocked") blocker.reset();
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const isSubscriptionInactive = !subLoading && !subscribed;

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-3xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={handleExitClick} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {isEditing ? "Editar Nota Fiscal" : "Nova Nota Fiscal de Serviço"}
          </h1>
          {isSubscriptionInactive && (
            <div className="mt-2 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Sua assinatura está inativa. Não é possível salvar ou emitir notas.
            </div>
          )}
        </div>

        <InvoiceWizardStepper steps={STEPS} currentStep={currentStep} />

        {/* Step content */}
        <div className="min-h-[300px]">
          {currentStep === 0 && <StepEmpresa form={form} set={set} companies={companies} />}
          {currentStep === 1 && <StepTomador form={form} set={set} />}
          {currentStep === 2 && <StepServico form={form} set={set} />}
          {currentStep === 3 && (
            <StepValores
              form={form}
              set={set}
              baseValue={baseValue}
              issValue={issValue}
              totalDeductions={totalDeductions}
              netValue={netValue}
              formatCurrency={formatCurrency}
            />
          )}
          {currentStep === 4 && (
            <StepRevisao
              form={form as Record<string, string | boolean>}
              companies={companies}
              baseValue={baseValue}
              issValue={issValue}
              totalDeductions={totalDeductions}
              netValue={netValue}
              formatCurrency={formatCurrency}
              onEmit={canEmit && !isSubscriptionInactive ? handleSaveAndEmit : undefined}
              emitting={emitting}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pb-8 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? handleExitClick : goBack}
            className="w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={loading || isSubscriptionInactive} className="w-auto">
              <Send className="mr-2 h-4 w-4" />
              {loading ? "Salvando..." : "Salvar Rascunho"}
            </Button>
          ) : (
            <Button onClick={goNext} className="w-auto">
              Próximo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Exit confirmation dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={(open) => { if (!open) handleCancelDialog(); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do formulário?</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem alterações não salvas. Deseja salvar como rascunho para continuar depois ou descartar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={handleCancelDialog}>Continuar Editando</AlertDialogCancel>
            <Button variant="outline" onClick={handleDiscard}>Descartar</Button>
            <AlertDialogAction onClick={handleSaveDraft}>Salvar Rascunho</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
