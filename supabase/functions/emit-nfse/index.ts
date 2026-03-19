import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SEFIN_HOST = "sefin.nfse.gov.br";
const SEFIN_PATH = "/SefinNacional/nfse";

// ─── mTLS fetch via external proxy ─────────────────────────────────────────

async function mtlsFetch(
  method: string,
  path: string,
  body: string,
  certPem: string,
  keyPem: string,
  contentType = "application/xml",
): Promise<{ status: number; body: string }> {
  const proxyUrlRaw = Deno.env.get("MTLS_PROXY_URL")?.trim();
  const proxyToken = Deno.env.get("MTLS_PROXY_TOKEN");

  if (!proxyUrlRaw || !proxyToken) {
    throw new Error("MTLS_PROXY_URL and MTLS_PROXY_TOKEN must be configured");
  }

  const proxyBase = /^https?:\/\//i.test(proxyUrlRaw)
    ? proxyUrlRaw
    : `https://${proxyUrlRaw}`;

  const proxyEndpoint = new URL("/proxy", proxyBase).toString();

  const proxyResponse = await fetch(proxyEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${proxyToken}`,
    },
    body: JSON.stringify({
      method,
      hostname: SEFIN_HOST,
      path,
      body,
      certPem,
      keyPem,
      contentType,
    }),
  });

  const result = await proxyResponse.json();

  if (!proxyResponse.ok) {
    throw new Error(`Proxy error: ${result.error || proxyResponse.statusText}`);
  }

  return {
    status: result.status,
    body: result.body,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function decryptPassword(encrypted: string, masterKey: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted password format");
  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = forge.util.hexToBytes(ivHex);
  const authTag = forge.util.hexToBytes(authTagHex);
  const encData = forge.util.hexToBytes(encryptedHex);
  const keyBytes = forge.util.hexToBytes(masterKey);
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

  // Build full certificate chain PEM (end-entity + intermediaries)
  const allCertsPem = certs
    .filter((b: any) => b.cert)
    .map((b: any) => forge.pki.certificateToPem(b.cert))
    .join("\n");

  return {
    cert: certs[0].cert,
    key: keys[0].key,
    certPem: allCertsPem,
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
  number: number,
): string {
  const ibge = padLeft(cityCode, 7);
  const tipo = docType; // "1" = CNPJ, "2" = CPF
  const inscricao = padLeft(formatDocument(document), 14);
  // Series must be numeric only (5 digits) per TSIdDPS pattern
  const numericSeries = series.replace(/\D/g, "") || "1";
  const serie = padLeft(numericSeries, 5);
  const num = padLeft(number, 15);
  return `${ibge}${tipo}${inscricao}${serie}${num}`;
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
  const regEspTrib = invoice.special_tax_regime || "0";

  let issqnExigType = "1";
  if (invoice.issqn_suspended) issqnExigType = "3";
  else if (invoice.issqn_taxation === "imune") issqnExigType = "4";
  else if (invoice.issqn_taxation === "isenta") issqnExigType = "5";
  else if (invoice.issqn_taxation === "exportacao") issqnExigType = "6";
  else if (invoice.issqn_taxation === "nao_incidencia") issqnExigType = "2";

  const competenceDate = invoice.competence_date || new Date().toISOString().split("T")[0];
  const cityCode = company.address_city_code || "0000000";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += `<DPS xmlns="${ns}" versao="1.00">`;
  xml += `<infDPS Id="DPS${dpsId}">`;

  xml += `<tpAmb>1</tpAmb>`;
  // TSDateTimeUTC requires YYYY-MM-DDTHH:MM:SS-03:00 (no millis, with BRT offset)
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  // Convert to BRT (UTC-3)
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const dhEmi = `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth()+1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}:${pad(brt.getUTCSeconds())}-03:00`;
  xml += `<dhEmi>${dhEmi}</dhEmi>`;
  xml += `<verAplic>NFSE-FLOW-1.0</verAplic>`;

  // Schema expects serie and nDPS before dCompet
  const serieDigits = String(invoice.rps_series || "1").replace(/\D/g, "") || "1";
  xml += `<serie>${Number(serieDigits)}</serie>`;
  xml += `<nDPS>${Number(invoice.rps_number || 1)}</nDPS>`;

  xml += `<dCompet>${competenceDate}</dCompet>`;

  // tpEmit: 1=Prestador de Serviço, 2=Tomador, 3=Intermediário
  xml += `<tpEmit>1</tpEmit>`;

  // cLocEmi: Código IBGE do município de emissão (7 dígitos)
  xml += `<cLocEmi>${padLeft(cityCode, 7)}</cLocEmi>`;

  // ─── prest (Prestador) ─────────────────────────────
  xml += `<prest>`;
  xml += `<CNPJ>${formatDocument(company.document)}</CNPJ>`;
  if (company.municipal_registration) {
    xml += `<IM>${company.municipal_registration}</IM>`;
  }
  xml += `<xNome>${escapeXml(company.legal_name)}</xNome>`;
  if (company.address_street) {
    xml += `<end>`;
    xml += `<endNac>`;
    xml += `<cMun>${padLeft(cityCode, 7)}</cMun>`;
    xml += `<CEP>${(company.address_zip || "").replace(/\D/g, "")}</CEP>`;
    xml += `</endNac>`;
    xml += `<xLgr>${escapeXml(company.address_street)}</xLgr>`;
    xml += `<nro>${company.address_number || "S/N"}</nro>`;
    if (company.address_complement) xml += `<xCpl>${escapeXml(company.address_complement)}</xCpl>`;
    if (company.address_neighborhood) xml += `<xBairro>${escapeXml(company.address_neighborhood)}</xBairro>`;
    xml += `</end>`;
  }
  if (company.phone) xml += `<fone>${company.phone.replace(/\D/g, "")}</fone>`;
  if (company.email) xml += `<email>${company.email}</email>`;
  xml += `<regTrib>`;
  xml += `<opSimpNac>${invoice.tax_assessment_regime || "1"}</opSimpNac>`;
  xml += `<regApTribSN>${invoice.tax_assessment_regime || "1"}</regApTribSN>`;
  if (regEspTrib !== "nenhum" && regEspTrib !== "0") {
    const regEspMap: Record<string, string> = {
      microempresa_municipal: "1", estimativa: "2", sociedade_profissionais: "3",
      cooperativa: "4", mei: "5", me_epp: "6",
    };
    xml += `<regEspTrib>${regEspMap[regEspTrib] || "0"}</regEspTrib>`;
  }
  xml += `</regTrib>`;
  xml += `</prest>`;

  // ─── toma (Tomador) ────────────────────────────────
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
    xml += `<endNac>`;
    if (invoice.taker_address_city_code) xml += `<cMun>${padLeft(invoice.taker_address_city_code, 7)}</cMun>`;
    if (invoice.taker_address_zip) xml += `<CEP>${invoice.taker_address_zip.replace(/\D/g, "")}</CEP>`;
    xml += `</endNac>`;
    xml += `<xLgr>${escapeXml(invoice.taker_address_street)}</xLgr>`;
    xml += `<nro>${invoice.taker_address_number || "S/N"}</nro>`;
    xml += `</end>`;
  }
  if (invoice.taker_phone) xml += `<fone>${invoice.taker_phone.replace(/\D/g, "")}</fone>`;
  if (invoice.taker_email) xml += `<email>${invoice.taker_email}</email>`;
  xml += `</toma>`;

  // ─── interm (Intermediário) ────────────────────────
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

  // ─── serv (Serviço) ───────────────────────────────
  xml += `<serv>`;
  xml += `<cServ>${(invoice.tax_code || "").replace(/\./g, "")}</cServ>`;
  if (company.cnae_code) xml += `<cCnae>${company.cnae_code.replace(/\./g, "")}</cCnae>`;
  if (invoice.nbs_code) xml += `<CNBS>${invoice.nbs_code.replace(/\D/g, "")}</CNBS>`;
  xml += `<xDescServ>${escapeXml(invoice.service_description || "")}</xDescServ>`;
  xml += `<cMunPrestacao>${padLeft(cityCode, 7)}</cMunPrestacao>`;
  if (invoice.issqn_city) xml += `<cMunIncid>${padLeft(String(invoice.issqn_city).replace(/\D/g, "") || cityCode, 7)}</cMunIncid>`;
  xml += `</serv>`;

  // ─── valores ──────────────────────────────────────
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
  if (invoice.issqn_retained_by_taker || invoice.iss_retained) xml += `<tpRetISSQN>1</tpRetISSQN>`;
  xml += `</BM>`;
  xml += `</tribMun>`;

  xml += `<tribFed>`;
  if (Number(invoice.pis_value || 0) > 0) xml += `<vPIS>${Number(invoice.pis_value).toFixed(2)}</vPIS>`;
  if (Number(invoice.cofins_value || 0) > 0) xml += `<vCOFINS>${Number(invoice.cofins_value).toFixed(2)}</vCOFINS>`;
  if (Number(invoice.inss_value || 0) > 0) xml += `<vINSS>${Number(invoice.inss_value).toFixed(2)}</vINSS>`;
  if (Number(invoice.ir_value || 0) > 0) xml += `<vIR>${Number(invoice.ir_value).toFixed(2)}</vIR>`;
  if (Number(invoice.csll_value || 0) > 0) xml += `<vCSLL>${Number(invoice.csll_value).toFixed(2)}</vCSLL>`;
  xml += `</tribFed>`;

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

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ─── XML Signing ────────────────────────────────────────────────────────────

function signXml(xml: string, privateKey: forge.pki.rsa.PrivateKey, cert: forge.pki.Certificate): string {
  const infDpsMatch = xml.match(/<infDPS[^>]*>[\s\S]*<\/infDPS>/);
  if (!infDpsMatch) throw new Error("infDPS element not found in XML");

  const infDps = infDpsMatch[0];
  const idMatch = infDps.match(/Id="([^"]+)"/);
  const referenceUri = idMatch ? `#${idMatch[1]}` : "";

  const canonicalized = infDps;

  const md = forge.md.sha256.create();
  md.update(canonicalized, "utf8");
  const digestValue = forge.util.encode64(md.digest().bytes());

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

  const signMd = forge.md.sha256.create();
  signMd.update(signedInfo, "utf8");
  const signature = privateKey.sign(signMd);
  const signatureValue = forge.util.encode64(signature);

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

    // Load invoice
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

    // Download PFX
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
    const encParts = certRecord.password_encrypted.split(":");
    if (encParts.length === 3) {
      try {
        certPassword = decryptPassword(certRecord.password_encrypted, masterKey);
      } catch {
        console.warn("Failed to decrypt password, trying as plain text");
        certPassword = certRecord.password_encrypted;
      }
    } else {
      console.warn("Certificate password is not encrypted, using as plain text");
      certPassword = certRecord.password_encrypted;
    }

    // Load certificate and key
    console.log("Loading PFX certificate...");
    const arrayBuffer = await fileData.arrayBuffer();
    const pfxBinary = String.fromCharCode(...new Uint8Array(arrayBuffer));

    let certData: { cert: any; key: any; certPem: string; keyPem: string };
    try {
      certData = loadCertificate(pfxBinary, certPassword);
      console.log("Certificate loaded successfully");
    } catch (loadErr) {
      console.error("Failed to load certificate:", loadErr);
      return new Response(JSON.stringify({ error: `Failed to load certificate: ${loadErr instanceof Error ? loadErr.message : "Unknown"}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { cert, key, certPem, keyPem } = certData;

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
      rpsNumber,
    );

    // Update RPS number
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

    // ─── Send via proxy (mTLS) ─────────────────────────────────────────
    try {
      // SEFIN Nacional expects JSON with GZip+Base64 encoded signed XML
      // 1. Compress signed XML with GZip
      const xmlBytes = new TextEncoder().encode(signedXml);
      const cs = new CompressionStream("gzip");
      const csWriter = cs.writable.getWriter();
      csWriter.write(xmlBytes);
      csWriter.close();
      const gzippedBuf = await new Response(cs.readable).arrayBuffer();
      const gzippedBytes = new Uint8Array(gzippedBuf);

      // 2. Base64 encode the gzipped data
      let binaryStr = "";
      for (let i = 0; i < gzippedBytes.length; i++) {
        binaryStr += String.fromCharCode(gzippedBytes[i]);
      }
      const dpsXmlGZipB64 = btoa(binaryStr);

      // 3. Build JSON payload as required by SEFIN Nacional API
      const jsonPayload = JSON.stringify({ dpsXmlGZipB64 });

      console.log(`Sending to SEFIN via proxy: POST ${SEFIN_HOST}${SEFIN_PATH} (JSON/GZip+B64, ${jsonPayload.length} bytes)`);

      const result = await mtlsFetch("POST", SEFIN_PATH, jsonPayload, certPem, keyPem, "application/json");

      console.log(`SEFIN response status: ${result.status}`);
      console.log(`SEFIN response body (first 500 chars): ${result.body.substring(0, 500)}`);

      await supabase.from("nfse_events").insert({
        invoice_id,
        tenant_id: invoice.tenant_id,
        event_type: "submitted",
        description: `Enviado à Sefin Nacional (JSON/GZip+B64). Status HTTP: ${result.status}`,
        response_xml: result.body,
        created_by: userData.user.id,
      });

      // Parse JSON response from SEFIN
      let responseData: Record<string, unknown> | null = null;
      try {
        responseData = JSON.parse(result.body);
      } catch {
        // Response may not be valid JSON
      }

      if (result.status >= 200 && result.status < 300 && responseData) {
        // Decode nfseXmlGZipB64 if present in the response
        let nfseXml = "";
        if (responseData.nfseXmlGZipB64 && typeof responseData.nfseXmlGZipB64 === "string") {
          try {
            const gzipBin = Uint8Array.from(atob(responseData.nfseXmlGZipB64 as string), (c) => c.charCodeAt(0));
            const ds = new DecompressionStream("gzip");
            const dsWriter = ds.writable.getWriter();
            dsWriter.write(gzipBin);
            dsWriter.close();
            nfseXml = await new Response(ds.readable).text();
          } catch (decErr) {
            console.warn("Failed to decode nfseXmlGZipB64:", decErr);
            nfseXml = result.body;
          }
        }

        const chaveAcesso = (responseData.chNFSe || responseData.chaveAcesso || null) as string | null;
        const nProt = (responseData.nProt || null) as string | null;
        const nNFSe = (responseData.nNFSe || null) as string | null;
        const cVerif = (responseData.cVerif || null) as string | null;

        await supabase.from("nfse_invoices").update({
          status: "authorized",
          xml_authorized: nfseXml || result.body,
          xml_response: result.body,
          protocol_number: nProt,
          invoice_number: nNFSe ? parseInt(nNFSe) : null,
          verification_code: cVerif,
          issued_at: new Date().toISOString(),
          metadata: {
            ...(invoice.metadata || {}),
            chave_acesso: chaveAcesso,
            dps_id: dpsId,
          },
        }).eq("id", invoice_id);

        await supabase.from("nfse_events").insert({
          invoice_id,
          tenant_id: invoice.tenant_id,
          event_type: "authorized",
          description: `NFS-e autorizada. ${chaveAcesso ? `Chave: ${chaveAcesso}` : ""}`,
          created_by: userData.user.id,
        });

        return new Response(JSON.stringify({
          success: true,
          status: "authorized",
          chave_acesso: chaveAcesso,
          protocol: nProt,
          invoice_number: nNFSe,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Rejection or error
        const errorMsg = (responseData?.message || responseData?.xMotivo || result.body.substring(0, 500)) as string;
        const errorCode = String(responseData?.cStat || responseData?.codigo || result.status);

        await supabase.from("nfse_invoices").update({
          status: "rejected",
          xml_response: result.body,
        }).eq("id", invoice_id);

        await supabase.from("nfse_events").insert({
          invoice_id,
          tenant_id: invoice.tenant_id,
          event_type: "rejected",
          error_code: errorCode,
          error_message: errorMsg,
          response_xml: result.body,
          created_by: userData.user.id,
        });

        return new Response(JSON.stringify({
          success: false,
          status: "rejected",
          error_code: errorCode,
          error_message: errorMsg,
          response: result.body,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (fetchError: unknown) {
      const errorMsg = fetchError instanceof Error ? fetchError.message : "Unknown fetch error";
      console.error("mTLS fetch error:", errorMsg);

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
