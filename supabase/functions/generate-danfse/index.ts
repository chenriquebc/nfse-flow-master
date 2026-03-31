import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(d: string): string {
  if (!d) return "—";
  const parts = d.split("T")[0].split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return d;
}

function formatDoc(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  return doc;
}

function generatePdfHtml(invoice: any, company: any): string {
  const chaveAcesso = invoice.metadata?.chave_acesso || "—";
  const invoiceNum = invoice.invoice_number || "—";
  const rpsNum = invoice.rps_number || "—";
  const competence = formatDate(invoice.competence_date);
  const issuedAt = invoice.issued_at ? formatDate(invoice.issued_at) : "—";
  const verificationCode = invoice.verification_code || "—";

  const serviceValue = Number(invoice.service_value || 0);
  const deductionValue = Number(invoice.deduction_value || 0);
  const discountValue = Number(invoice.discount_value || 0);
  const baseValue = Number(invoice.base_value || serviceValue - deductionValue);
  const issRate = Number(invoice.iss_rate || 0);
  const issValue = Number(invoice.iss_value || 0);
  const netValue = Number(invoice.net_value || 0);
  const pisValue = Number(invoice.pis_value || 0);
  const cofinsValue = Number(invoice.cofins_value || 0);
  const inssValue = Number(invoice.inss_value || 0);
  const irValue = Number(invoice.ir_value || 0);
  const csllValue = Number(invoice.csll_value || 0);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9pt; color: #333; line-height: 1.4; }
  .header { text-align: center; border: 2px solid #333; padding: 8px; margin-bottom: 8px; }
  .header h1 { font-size: 14pt; font-weight: bold; margin-bottom: 2px; }
  .header h2 { font-size: 10pt; font-weight: normal; color: #666; }
  .section { border: 1px solid #999; margin-bottom: 6px; }
  .section-title { background: #e8e8e8; padding: 3px 8px; font-weight: bold; font-size: 8pt; text-transform: uppercase; border-bottom: 1px solid #999; }
  .section-body { padding: 6px 8px; }
  .row { display: flex; gap: 10px; margin-bottom: 4px; }
  .field { flex: 1; }
  .field-label { font-size: 7pt; color: #666; text-transform: uppercase; }
  .field-value { font-size: 9pt; font-weight: 500; }
  .field-value.mono { font-family: 'Courier New', monospace; }
  table.values { width: 100%; border-collapse: collapse; font-size: 8pt; }
  table.values th { background: #e8e8e8; padding: 3px 6px; text-align: left; border: 1px solid #999; font-size: 7pt; }
  table.values td { padding: 3px 6px; border: 1px solid #ccc; }
  table.values td.right { text-align: right; }
  .key-box { background: #f5f5f5; border: 1px solid #999; padding: 6px 8px; margin-bottom: 8px; text-align: center; }
  .key-box .label { font-size: 7pt; color: #666; }
  .key-box .value { font-family: 'Courier New', monospace; font-size: 9pt; font-weight: bold; letter-spacing: 1px; }
  .footer { text-align: center; font-size: 7pt; color: #999; margin-top: 12px; }
  .total-row { font-weight: bold; background: #f0f0f0; }
</style>
</head>
<body>
  <div class="header">
    <h1>DOCUMENTO AUXILIAR DA NFS-e</h1>
    <h2>DANFS-e</h2>
  </div>

  <div class="key-box">
    <div class="label">CHAVE DE ACESSO</div>
    <div class="value">${escapeXml(chaveAcesso)}</div>
  </div>

  <div class="section">
    <div class="section-title">Dados da NFS-e</div>
    <div class="section-body">
      <div class="row">
        <div class="field"><div class="field-label">Número NFS-e</div><div class="field-value">${invoiceNum}</div></div>
        <div class="field"><div class="field-label">Número DPS/RPS</div><div class="field-value">${rpsNum}</div></div>
        <div class="field"><div class="field-label">Competência</div><div class="field-value">${competence}</div></div>
        <div class="field"><div class="field-label">Data Emissão</div><div class="field-value">${issuedAt}</div></div>
        <div class="field"><div class="field-label">Cód. Verificação</div><div class="field-value mono">${escapeXml(verificationCode)}</div></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Prestador de Serviços</div>
    <div class="section-body">
      <div class="row">
        <div class="field" style="flex:2"><div class="field-label">Razão Social</div><div class="field-value">${escapeXml(company.legal_name || "")}</div></div>
        <div class="field"><div class="field-label">CNPJ</div><div class="field-value mono">${formatDoc(company.document || "")}</div></div>
        <div class="field"><div class="field-label">Inscrição Municipal</div><div class="field-value">${escapeXml(company.municipal_registration || "—")}</div></div>
      </div>
      <div class="row">
        <div class="field" style="flex:2"><div class="field-label">Endereço</div><div class="field-value">${escapeXml([company.address_street, company.address_number, company.address_neighborhood].filter(Boolean).join(", ") || "—")}</div></div>
        <div class="field"><div class="field-label">Cidade/UF</div><div class="field-value">${escapeXml([company.address_city, company.address_state].filter(Boolean).join("/") || "—")}</div></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Tomador de Serviços</div>
    <div class="section-body">
      <div class="row">
        <div class="field" style="flex:2"><div class="field-label">Nome/Razão Social</div><div class="field-value">${escapeXml(invoice.taker_name || "Não informado")}</div></div>
        <div class="field"><div class="field-label">CPF/CNPJ</div><div class="field-value mono">${invoice.taker_document ? formatDoc(invoice.taker_document) : "—"}</div></div>
      </div>
      <div class="row">
        <div class="field" style="flex:2"><div class="field-label">Endereço</div><div class="field-value">${escapeXml([invoice.taker_address_street, invoice.taker_address_number].filter(Boolean).join(", ") || "—")}</div></div>
        <div class="field"><div class="field-label">Cidade/UF</div><div class="field-value">${escapeXml([invoice.taker_address_city, invoice.taker_address_state].filter(Boolean).join("/") || "—")}</div></div>
      </div>
      ${invoice.taker_email ? `<div class="row"><div class="field"><div class="field-label">E-mail</div><div class="field-value">${escapeXml(invoice.taker_email)}</div></div></div>` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Descrição do Serviço</div>
    <div class="section-body">
      <div class="field-value" style="white-space:pre-wrap;">${escapeXml(invoice.service_description || "—")}</div>
      <div class="row" style="margin-top:6px;">
        <div class="field"><div class="field-label">Cód. Tributação</div><div class="field-value">${escapeXml(invoice.tax_code || "—")}</div></div>
        <div class="field"><div class="field-label">NBS</div><div class="field-value">${escapeXml(invoice.nbs_code || "—")}</div></div>
        <div class="field"><div class="field-label">CNAE</div><div class="field-value">${escapeXml(invoice.cnae_code || "—")}</div></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Valores</div>
    <div class="section-body">
      <table class="values">
        <tr><th>Descrição</th><th style="text-align:right;width:120px;">Valor</th></tr>
        <tr><td>Valor do Serviço</td><td class="right">${formatCurrency(serviceValue)}</td></tr>
        ${deductionValue > 0 ? `<tr><td>(-) Deduções</td><td class="right">${formatCurrency(deductionValue)}</td></tr>` : ""}
        ${discountValue > 0 ? `<tr><td>(-) Descontos</td><td class="right">${formatCurrency(discountValue)}</td></tr>` : ""}
        <tr><td>Base de Cálculo</td><td class="right">${formatCurrency(baseValue)}</td></tr>
        <tr><td>Alíquota ISS</td><td class="right">${(issRate * 100).toFixed(2)}%</td></tr>
        <tr><td>Valor ISS ${invoice.iss_retained ? "(retido)" : ""}</td><td class="right">${formatCurrency(issValue)}</td></tr>
        ${pisValue > 0 ? `<tr><td>PIS</td><td class="right">${formatCurrency(pisValue)}</td></tr>` : ""}
        ${cofinsValue > 0 ? `<tr><td>COFINS</td><td class="right">${formatCurrency(cofinsValue)}</td></tr>` : ""}
        ${inssValue > 0 ? `<tr><td>INSS</td><td class="right">${formatCurrency(inssValue)}</td></tr>` : ""}
        ${irValue > 0 ? `<tr><td>IR</td><td class="right">${formatCurrency(irValue)}</td></tr>` : ""}
        ${csllValue > 0 ? `<tr><td>CSLL</td><td class="right">${formatCurrency(csllValue)}</td></tr>` : ""}
        <tr class="total-row"><td>VALOR LÍQUIDO</td><td class="right">${formatCurrency(netValue)}</td></tr>
      </table>
    </div>
  </div>

  ${invoice.notes ? `<div class="section"><div class="section-title">Observações</div><div class="section-body"><div class="field-value" style="white-space:pre-wrap;">${escapeXml(invoice.notes)}</div></div></div>` : ""}

  <div class="footer">Documento gerado pelo sistema NFS-e Flow</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Validate user
    const userSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { invoice_id } = await req.json();
    if (!invoice_id) {
      return new Response(JSON.stringify({ error: "invoice_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load invoice with company
    const { data: invoice, error: invError } = await supabase
      .from("nfse_invoices")
      .select("*, companies(*)")
      .eq("id", invoice_id)
      .single();

    if (invError || !invoice) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify user has access to this tenant
    const { data: membership } = await userSupabase
      .from("tenant_members")
      .select("id")
      .eq("tenant_id", invoice.tenant_id)
      .eq("user_id", userData.user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const company = invoice.companies || {};
    const html = generatePdfHtml(invoice, company);

    // Return HTML that the client can print/save as PDF
    return new Response(html, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error: unknown) {
    console.error("Error in generate-danfse:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
