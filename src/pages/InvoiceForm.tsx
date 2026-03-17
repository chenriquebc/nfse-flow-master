import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { useTenant } from "@/contexts/TenantContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Send } from "lucide-react";
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

export default function InvoiceForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const [form, setForm] = useState({
    company_id: "",
    competence_date: new Date().toISOString().split("T")[0],
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
    service_description: "",
    tax_code: "",
    nbs_code: "",
    municipal_tax_code: "",
    issqn_exemption: false,
    issqn_city: "",
    service_value: "",
    deduction_value: "0",
    discount_value: "0",
    iss_rate: "5",
    iss_retained: false,
    pis_value: "0",
    cofins_value: "0",
    inss_value: "0",
    ir_value: "0",
    csll_value: "0",
    notes: "",
  });

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
          competence_date: data.competence_date || new Date().toISOString().split("T")[0],
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
          service_description: data.service_description || "",
          tax_code: data.tax_code || "",
          nbs_code: data.nbs_code || "",
          municipal_tax_code: (data as any).municipal_tax_code || "",
          issqn_exemption: (data as any).issqn_exemption || false,
          issqn_city: (data as any).issqn_city || "",
          service_value: String(data.service_value || ""),
          deduction_value: String(data.deduction_value || 0),
          discount_value: String(data.discount_value || 0),
          iss_rate: String((data.iss_rate || 0) * 100),
          iss_retained: data.iss_retained || false,
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
        if (!form.taker_document.trim()) { toast.error("Informe o CPF/CNPJ do tomador"); return false; }
        if (!form.taker_name.trim()) { toast.error("Informe o nome do tomador"); return false; }
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

  const handleSubmit = async () => {
    if (!tenant || !user) return;

    setLoading(true);
    const payload = {
      tenant_id: tenant.id,
      company_id: form.company_id,
      competence_date: form.competence_date,
      taker_document: form.taker_document,
      taker_name: form.taker_name,
      taker_email: form.taker_email || null,
      taker_phone: form.taker_phone || null,
      taker_address_street: form.taker_address_street || null,
      taker_address_number: form.taker_address_number || null,
      taker_address_city: form.taker_address_city || null,
      taker_address_city_code: form.taker_address_city_code || null,
      taker_address_state: form.taker_address_state || null,
      taker_address_zip: form.taker_address_zip || null,
      service_description: form.service_description,
      tax_code: form.tax_code,
      nbs_code: form.nbs_code || null,
      cnae_code: form.municipal_tax_code || null,
      municipal_tax_code: form.municipal_tax_code || null,
      issqn_exemption: form.issqn_exemption,
      issqn_city: form.issqn_city || null,
      service_value: serviceValue,
      deduction_value: deductionValue,
      discount_value: discountValue,
      base_value: baseValue,
      iss_rate: issRate / 100,
      iss_value: issValue,
      iss_retained: form.iss_retained,
      pis_value: parseFloat(form.pis_value) || 0,
      cofins_value: parseFloat(form.cofins_value) || 0,
      inss_value: parseFloat(form.inss_value) || 0,
      ir_value: parseFloat(form.ir_value) || 0,
      csll_value: parseFloat(form.csll_value) || 0,
      net_value: netValue,
      notes: form.notes || null,
      status: "draft" as const,
      created_by: user.id,
    };

    let error;
    if (isEditing) {
      ({ error } = await supabase.from("nfse_invoices").update(payload).eq("id", id!));
    } else {
      ({ error } = await supabase.from("nfse_invoices").insert(payload));
    }

    if (error) {
      toast.error("Erro ao salvar nota", { description: error.message });
    } else {
      toast.success(isEditing ? "Nota fiscal atualizada!" : "Nota fiscal criada como rascunho!");
      navigate("/invoices");
    }
    setLoading(false);
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <AppLayout>
      <div className="animate-fade-in max-w-2xl mx-auto">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/invoices")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {isEditing ? "Editar Nota Fiscal" : "Nova Nota Fiscal de Serviço"}
          </h1>
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
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between mt-8 pb-8 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={currentStep === 0 ? () => navigate("/invoices") : goBack}
            className="w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            {currentStep === 0 ? "Cancelar" : "Voltar"}
          </Button>

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={loading} className="w-auto">
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
    </AppLayout>
  );
}
