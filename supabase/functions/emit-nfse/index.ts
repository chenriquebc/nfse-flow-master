import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ADN API base URL (Ambiente de Dados Nacional)
const ADN_BASE_URL = "https://sefin.nfse.gov.br/adn";

// ─── Helpers ────────────────────────────────────────────────────────────────

function decryptPassword(encrypted: string, masterKey: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) {
    console.warn("Certificate password is not encrypted, using as plain text");
    return encrypted;
  }
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = forge.util.hexToBytes(ivHex);
  const authTag = forge.util.hexToBytes(authTagHex);
  const encData = forge.util.hexToBytes(encryptedHex);
  const keyBytes = forge.util.hexToBytes(masterKey.trim());
  const decipher = forge.cipher.createDecipher("AES-GCM", keyBytes);
  decipher.start({ iv, tag: forge.util.createBuffer(authTag) });
  decipher.update(forge.util.createBuffer(encData));
  const pass = decipher.finish();
  if (!pass) throw new Error("Failed to decrypt certificate password");
  return decipher.output.toString();
}

function loadCertificate(pfxBinary: string, password: string) {
  const asn1 = forge.asn1.fromDer(pfxBinary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certs = certBags[forge.pki.oids.certBag];
  if (!certs || certs.length === 0) throw new Error("No certificate found in PFX");

  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];
  if (!keys || keys.length === 0) throw new Error("No private key found in PFX");

  return {
    cert: certs[0].cert,
    key: keys[0].key,
    certPem: forge.pki.certificateToPem(certs[0].cert!),
    keyPem: forge.pki.privateKeyToPem(keys[0].key as forge.pki.rsa.PrivateKey),
  };
}

function padLeft(value: string | number, length: number, char = "0"): string {
  return String(value).padStart(length, char);
}

function formatDocument(doc: string): string {
  return doc.replace(/\D/g, "");
}

function generateDPSId(
  cityCode: string,
  docType: string,
  document: string,
  series: string,
  number: number
): string {
  const ibge = padLeft(cityCode, 7);
  const tipo = docType;
  const inscricao = padLeft(formatDocument(document), 14);
  const serie = padLeft(series, 5);
  const num = padLeft(number, 15);
  return `${ibge}${tipo}${inscricao}${serie}${num}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── GZip + Base64 encoding for ADN API ─────────────────────────────────────

async function gzipAndBase64(xml: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(xml);

  // Use CompressionStream (available in Deno) to GZip
  const cs = new CompressionStream("gzip");
  const writer = cs.writable.getWriter();
  const reader = cs.readable.getReader();

  // Write and close
  writer.write(data);
  writer.close();

  // Read compressed
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  // Concatenate chunks
  let totalLength = 0;
  for (const chunk of chunks) totalLength += chunk.length;
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  // Base64 encode
  let binary = "";
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}

// ─── DPS XML Generation ────────────────────────────────────────────────────

function generateDPSXml(invoice: any, company: any, dpsId: string): string {
  const ns = 'http://www.sped.fazenda.gov.br/nfse';
  const serviceValue = Number(invoice.service_value || 0).toFixed(2);
  const deductionValue = Number(invoice.deduction_value || 0).toFixed(2);
  const unconditionalDiscount = Number(invoice.unconditional_discount || 0).toFixed(2);
  const conditionalDiscount = Number(invoice.conditional_discount || 0).toFixed(2);
  const issRate = Number(invoice.iss_rate || 0).toFixed(4);
  const issValue = Number(invoice.iss_value || 0).toFixed(2);
  const baseValue = Number(invoice.base_value || 0).toFixed(2);
  const netValue = Number(invoice.net_value || 0).toFixed(2);

  const regEspTrib = invoice.special_tax_regime || "0";

  // ISSQN exigibility type
  let issqnExigType = "1"; // Exigível
  if (invoice.issqn_suspended) issqnExigType = "3";
  else if (invoice.issqn_taxation === "imune") issqnExigType = "4";
  else if (invoice.issqn_taxation === "isenta") issqnExigType = "5";
  else if (invoice.issqn_taxation === "exportacao") issqnExigType = "6";
  else if (invoice.issqn_taxation === "nao_incidencia") issqnExigType = "2";

  const competenceDate = invoice.competence_date || new Date().toISOString().split("T")[0];
  const cityCode = company.address_city_code || "0000000";

  // Determine environment: 1=Produção, 2=Homologação
  const tpAmb = company.environment === 2 ? "2" : "1";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += `<DPS xmlns="${ns}" versao="1.00">`;
  xml += `<infDPS Id="DPS${dpsId}">`;

  xml += `<tpAmb>${tpAmb}</tpAmb>`;
  xml += `<dhEmi>${new Date().toISOString()}</dhEmi>`;
  xml += `<verAplic>NFSE-FLOW-1.0</verAplic>`;
  xml += `<dCompet>${competenceDate}</dCompet>`;
  xml += `<subItemListaServico>${invoice.tax_code || ""}</subItemListaServico>`;

  if (company.cnae_code) {
    xml += `<cCnae>${company.cnae_code}</cCnae>`;
  }
  if (invoice.nbs_code) {
    xml += `<CNBS>${invoice.nbs_code.replace(/\D/g, "")}</CNBS>`;
  }

  xml += `<xDescServ>${escapeXml(invoice.service_description || "")}</xDescServ>`;
  xml += `<cMunPrestacao>${cityCode}</cMunPrestacao>`;
  if (invoice.issqn_city) {
    xml += `<cMunIncid>${invoice.issqn_city}</cMunIncid>`;
  }

  // Provider (prestador)
  xml += `<prest>`;
  xml += `<CNPJ>${formatDocument(company.document)}</CNPJ>`;
  xml += `<IM>${company.municipal_registration || ""}</IM>`;
  xml += `<xNome>${escapeXml(company.legal_name)}</xNome>`;
  if (company.address_street) {
    xml += `<end>`;
    xml += `<xLgr>${escapeXml(company.address_street)}</xLgr>`;
    xml += `<nro>${company.address_number || "S/N"}</nro>`;
    if (company.address_complement) xml += `<xCpl>${escapeXml(company.address_complement)}</xCpl>`;
    if (company.address_neighborhood) xml += `<xBairro>${escapeXml(company.address_neighborhood)}</xBairro>`;
    xml += `<cMun>${cityCode}</cMun>`;
    xml += `<UF>${company.address_state || ""}</UF>`;
    xml += `<CEP>${(company.address_zip || "").replace(/\D/g, "")}</CEP>`;
    xml += `</end>`;
  }
  if (company.phone) xml += `<fone>${company.phone.replace(/\D/g, "")}</fone>`;
  if (company.email) xml += `<email>${company.email}</email>`;
  xml += `<regTrib>`;
  xml += `<opSN>${invoice.tax_assessment_regime || "1"}</opSN>`;
  xml += `<regApTribSN>${invoice.tax_assessment_regime || "1"}</regApTribSN>`;
  if (regEspTrib !== "nenhum" && regEspTrib !== "0") {
    const regEspMap: Record<string, string> = {
      microempresa_municipal: "1",
      estimativa: "2",
      sociedade_profissionais: "3",
      cooperativa: "4",
      mei: "5",
      me_epp: "6",
    };
    xml += `<regEspTrib>${regEspMap[regEspTrib] || "0"}</regEspTrib>`;
  }
  xml += `</regTrib>`;
  xml += `</prest>`;

  // Taker (tomador)
  xml += `<toma>`;
  const takerDoc = formatDocument(invoice.taker_document);
  if (takerDoc.length <= 11) {
    xml += `<CPF>${padLeft(takerDoc, 11)}</CPF>`;
  } else {
    xml += `<CNPJ>${padLeft(takerDoc, 14)}</CNPJ>`;
  }
  xml += `<xNome>${escapeXml(invoice.taker_name)}</xNome>`;
  if (invoice.taker_address_street) {
    xml += `<end>`;
    xml += `<xLgr>${escapeXml(invoice.taker_address_street)}</xLgr>`;
    xml += `<nro>${invoice.taker_address_number || "S/N"}</nro>`;
    if (invoice.taker_address_city_code) xml += `<cMun>${invoice.taker_address_city_code}</cMun>`;
    if (invoice.taker_address_state) xml += `<UF>${invoice.taker_address_state}</UF>`;
    if (invoice.taker_address_zip) xml += `<CEP>${invoice.taker_address_zip.replace(/\D/g, "")}</CEP>`;
    xml += `</end>`;
  }
  if (invoice.taker_phone) xml += `<fone>${invoice.taker_phone.replace(/\D/g, "")}</fone>`;
  if (invoice.taker_email) xml += `<email>${invoice.taker_email}</email>`;
  xml += `</toma>`;

  // Intermediary
  if (invoice.intermediary_type && invoice.intermediary_type !== "none" && invoice.intermediary_document) {
    xml += `<interm>`;
    const intermDoc = formatDocument(invoice.intermediary_document);
    if (intermDoc.length <= 11) {
      xml += `<CPF>${padLeft(intermDoc, 11)}</CPF>`;
    } else {
      xml += `<CNPJ>${padLeft(intermDoc, 14)}</CNPJ>`;
    }
    if (invoice.intermediary_name) xml += `<xNome>${escapeXml(invoice.intermediary_name)}</xNome>`;
    xml += `</interm>`;
  }

  // Values
  xml += `<valores>`;
  xml += `<vServPrest>`;
  xml += `<vServ>${serviceValue}</vServ>`;
  if (Number(deductionValue) > 0) xml += `<vDeducao>${deductionValue}</vDeducao>`;
  if (Number(unconditionalDiscount) > 0) xml += `<vDescIncond>${unconditionalDiscount}</vDescIncond>`;
  if (Number(conditionalDiscount) > 0) xml += `<vDescCond>${conditionalDiscount}</vDescCond>`;
  xml += `</vServPrest>`;

  xml += `<trib>`;
  xml += `<tribMun>`;
  xml += `<tribISSQN>${issqnExigType}</tribISSQN>`;
  xml += `<cPaisResult>1058</cPaisResult>`;
  xml += `<BM>`;
  xml += `<vBCISS>${baseValue}</vBCISS>`;
  xml += `<pAliq>${issRate}</pAliq>`;
  xml += `<vISS>${issValue}</vISS>`;
  if (invoice.issqn_retained_by_taker || invoice.iss_retained) {
    xml += `<tpRetISSQN>1</tpRetISSQN>`;
  }
  xml += `</BM>`;
  xml += `</tribMun>`;

  // Federal taxes
  xml += `<tribFed>`;
  if (Number(invoice.pis_value || 0) > 0) xml += `<vPIS>${Number(invoice.pis_value).toFixed(2)}</vPIS>`;
  if (Number(invoice.cofins_value || 0) > 0) xml += `<vCOFINS>${Number(invoice.cofins_value).toFixed(2)}</vCOFINS>`;
  if (Number(invoice.inss_value || 0) > 0) xml += `<vINSS>${Number(invoice.inss_value).toFixed(2)}</vINSS>`;
  if (Number(invoice.ir_value || 0) > 0) xml += `<vIR>${Number(invoice.ir_value).toFixed(2)}</vIR>`;
  if (Number(invoice.csll_value || 0) > 0) xml += `<vCSLL>${Number(invoice.csll_value).toFixed(2)}</vCSLL>`;
  xml += `</tribFed>`;

  // Approximate total tax
  if (invoice.approx_tax_mode === "simples_nacional" && Number(invoice.simples_nacional_rate || 0) > 0) {
    const approxTax = (Number(invoice.service_value) * Number(invoice.simples_nacional_rate) / 100).toFixed(2);
    xml += `<totTrib>`;
    xml += `<vTotTrib>${approxTax}</vTotTrib>`;
    xml += `</totTrib>`;
  }

  xml += `</trib>`;
  xml += `</valores>`;

  xml += `</infDPS>`;
  xml += `</DPS>`;

  return xml;
}

// ─── XML Signing ────────────────────────────────────────────────────────────

function signXml(xml: string, privateKey: forge.pki.rsa.PrivateKey, cert: forge.pki.Certificate): string {
  const infDpsMatch = xml.match(/<infDPS[^>]*>[\s\S]*<\/infDPS>/);
  if (!infDpsMatch) throw new Error("infDPS element not found in XML");

  const infDps = infDpsMatch[0];
  const idMatch = infDps.match(/Id="([^"]+)"/);
  const referenceUri = idMatch ? `#${idMatch[1]}` : "";

  const canonicalized = infDps;

  // SHA-256 digest
  const md = forge.md.sha256.create();
  md.update(canonicalized, "utf8");
  const digestValue = forge.util.encode64(md.digest().bytes());

  // Build SignedInfo
  const signedInfo = `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
    `<Reference URI="${referenceUri}">` +
    `<Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>` +
    `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;

  // Sign
  const signMd = forge.md.sha256.create();
  signMd.update(signedInfo, "utf8");
  const signature = privateKey.sign(signMd);
  const signatureValue = forge.util.encode64(signature);

  // Certificate in base64 (DER)
  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).bytes();
  const x509Certificate = forge.util.encode64(certDer);

  const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo>` +
    `<X509Data>` +
    `<X509Certificate>${x509Certificate}</X509Certificate>` +
    `</X509Data>` +
    `</KeyInfo>` +
    `</Signature>`;

  return xml.replace("</DPS>", signatureXml + "</DPS>");
}

// ─── Main Handler ───────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const masterKey = Deno.env.get("CERTIFICATE_MASTER_KEY");

    if (!masterKey) {
      return new Response(JSON.stringify({ error: "CERTIFICATE_MASTER_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    if (invoice.status !== "draft") {
      return new Response(JSON.stringify({ error: `Invoice status is '${invoice.status}', expected 'draft'` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const company = invoice.companies;
    if (!company) {
      return new Response(JSON.stringify({ error: "Company not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load certificate
    const { data: certRecord, error: certError } = await supabase
      .from("certificates")
      .select("*")
      .eq("company_id", company.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (certError || !certRecord) {
      return new Response(JSON.stringify({ error: "No active certificate found for this company" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download PFX from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("certificates")
      .download(certRecord.file_path);

    if (fileError || !fileData) {
      return new Response(JSON.stringify({ error: "Failed to download certificate file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Decrypt password
    let certPassword: string;
    try {
      certPassword = decryptPassword(certRecord.password_encrypted, masterKey);
    } catch (e) {
      return new Response(JSON.stringify({ error: "Failed to decrypt certificate password" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load certificate and key
    const arrayBuffer = await fileData.arrayBuffer();
    const pfxBinary = String.fromCharCode(...new Uint8Array(arrayBuffer));
    const { cert, key, certPem, keyPem } = loadCertificate(pfxBinary, certPassword);

    // Generate RPS number
    const { count } = await supabase
      .from("nfse_invoices")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id);
    const rpsNumber = (count || 0) + 1;

    // Generate DPS ID
    const dpsId = generateDPSId(
      company.address_city_code || "0000000",
      "1",
      company.document,
      invoice.rps_series || "RPS",
      rpsNumber
    );

    // Update RPS number and set processing
    await supabase.from("nfse_invoices").update({
      rps_number: rpsNumber,
      status: "processing",
    }).eq("id", invoice_id);

    await supabase.from("nfse_events").insert({
      invoice_id,
      tenant_id: invoice.tenant_id,
      event_type: "created",
      description: `Emissão iniciada. DPS ID: ${dpsId}`,
      created_by: userData.user.id,
    });

    // Generate XML
    const dpsXml = generateDPSXml(invoice, company, dpsId);

    await supabase.from("nfse_events").insert({
      invoice_id,
      tenant_id: invoice.tenant_id,
      event_type: "xml_generated",
      description: "XML da DPS gerado",
      request_xml: dpsXml,
      created_by: userData.user.id,
    });

    // Sign XML
    const signedXml = signXml(dpsXml, key as forge.pki.rsa.PrivateKey, cert!);

    // Store signed XML
    await supabase.from("nfse_invoices").update({
      xml_rps: dpsXml,
      xml_signed: signedXml,
    }).eq("id", invoice_id);

    await supabase.from("nfse_events").insert({
      invoice_id,
      tenant_id: invoice.tenant_id,
      event_type: "xml_signed",
      description: "XML assinado digitalmente",
      created_by: userData.user.id,
    });

    // ─── ADN API: GZip + Base64 encode the signed XML ───────────────────────
    const xmlGzipB64 = await gzipAndBase64(signedXml);

    // Build ADN API payload per swagger spec: POST /adn/DFe
    const adnPayload = {
      LoteXmlGZipB64: [xmlGzipB64],
    };

    // Create mTLS HTTP client (HTTP/1.1 only - SEFIN does not support HTTP/2)
    let httpClient: Deno.HttpClient;
    try {
      httpClient = Deno.createHttpClient({
        certChain: certPem,
        privateKey: keyPem,
        http2: false,
      });
    } catch (e) {
      await supabase.from("nfse_invoices").update({ status: "rejected" }).eq("id", invoice_id);
      await supabase.from("nfse_events").insert({
        invoice_id,
        tenant_id: invoice.tenant_id,
        event_type: "error",
        error_message: `Failed to create mTLS client: ${e instanceof Error ? e.message : "Unknown"}`,
        created_by: userData.user.id,
      });
      return new Response(JSON.stringify({ error: "Failed to create mTLS client" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      console.log("Sending to ADN API (POST /adn/DFe)...");
      console.log("Payload size (GZip+B64):", xmlGzipB64.length, "chars");

      const response = await fetch(`${ADN_BASE_URL}/DFe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(adnPayload),
        client: httpClient,
      } as any);

      const responseText = await response.text();

      // Log raw response
      await supabase.from("nfse_events").insert({
        invoice_id,
        tenant_id: invoice.tenant_id,
        event_type: "submitted",
        description: `Enviado à ADN API. Status HTTP: ${response.status}`,
        response_xml: responseText,
        created_by: userData.user.id,
      });

      if (response.status === 201 || response.ok) {
        // Parse ADN RecepcaoResponseLote JSON
        let adnResponse: any;
        try {
          adnResponse = JSON.parse(responseText);
        } catch {
          // Fallback: try XML parsing if JSON fails
          adnResponse = null;
        }

        if (adnResponse?.Lote && adnResponse.Lote.length > 0) {
          const doc = adnResponse.Lote[0];
          const chaveAcesso = doc.ChaveAcesso || null;
          const statusProc = doc.StatusProcessamento || null;
          const nsuRecepcao = doc.NsuRecepcao || null;
          const erros = doc.Erros || [];
          const alertas = doc.Alertas || [];

          // Check if there are errors
          if (erros.length > 0) {
            const errorMessages = erros.map((e: any) =>
              `${e.Codigo || ""}: ${e.Descricao || e.Complemento || "Erro desconhecido"}`
            ).join("; ");

            await supabase.from("nfse_invoices").update({
              status: "rejected",
              xml_response: responseText,
            }).eq("id", invoice_id);

            await supabase.from("nfse_events").insert({
              invoice_id,
              tenant_id: invoice.tenant_id,
              event_type: "rejected",
              error_code: erros[0]?.Codigo || null,
              error_message: errorMessages,
              response_xml: responseText,
              created_by: userData.user.id,
            });

            return new Response(JSON.stringify({
              success: false,
              status: "rejected",
              error_message: errorMessages,
              alertas: alertas.map((a: any) => a.Descricao || a.Complemento).filter(Boolean),
            }), {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          // Success: authorized or processing
          const alertaMessages = alertas.map((a: any) => a.Descricao || a.Complemento).filter(Boolean);

          await supabase.from("nfse_invoices").update({
            status: "authorized",
            xml_response: responseText,
            issued_at: new Date().toISOString(),
            metadata: {
              ...(invoice.metadata || {}),
              chave_acesso: chaveAcesso,
              nsu_recepcao: nsuRecepcao,
              status_processamento: statusProc,
              dps_id: dpsId,
              tipo_ambiente: adnResponse.TipoAmbiente || null,
            },
          }).eq("id", invoice_id);

          await supabase.from("nfse_events").insert({
            invoice_id,
            tenant_id: invoice.tenant_id,
            event_type: "authorized",
            description: `NFS-e recepcionada. Chave: ${chaveAcesso || "N/A"}. Status: ${statusProc || "N/A"}`,
            created_by: userData.user.id,
          });

          return new Response(JSON.stringify({
            success: true,
            status: "authorized",
            chave_acesso: chaveAcesso,
            nsu_recepcao: nsuRecepcao,
            status_processamento: statusProc,
            alertas: alertaMessages,
          }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // No Lote items — unexpected but handle
        await supabase.from("nfse_invoices").update({
          status: "rejected",
          xml_response: responseText,
        }).eq("id", invoice_id);

        return new Response(JSON.stringify({
          success: false,
          status: "rejected",
          error_message: "Resposta da ADN não contém documentos no lote",
          raw_response: responseText,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // HTTP error (400, 500, etc.)
        let errorDetail = responseText;
        try {
          const problemDetails = JSON.parse(responseText);
          errorDetail = problemDetails.detail || problemDetails.title || responseText;
        } catch {}

        await supabase.from("nfse_invoices").update({
          status: "rejected",
          xml_response: responseText,
        }).eq("id", invoice_id);

        await supabase.from("nfse_events").insert({
          invoice_id,
          tenant_id: invoice.tenant_id,
          event_type: "rejected",
          error_code: String(response.status),
          error_message: errorDetail.substring(0, 1000),
          response_xml: responseText,
          created_by: userData.user.id,
        });

        return new Response(JSON.stringify({
          success: false,
          status: "rejected",
          error_code: String(response.status),
          error_message: errorDetail,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (fetchError: unknown) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";

      await supabase.from("nfse_invoices").update({ status: "rejected" }).eq("id", invoice_id);
      await supabase.from("nfse_events").insert({
        invoice_id,
        tenant_id: invoice.tenant_id,
        event_type: "error",
        error_message: errorMsg,
        created_by: userData.user.id,
      });

      return new Response(JSON.stringify({ error: `Communication error: ${errorMsg}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } finally {
      httpClient.close();
    }
  } catch (error: unknown) {
    console.error("Error in emit-nfse:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
