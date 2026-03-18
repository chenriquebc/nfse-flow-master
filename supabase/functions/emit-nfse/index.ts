import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SEFIN_BASE_URL = "https://sefin.nfse.gov.br/SefinNacional";

// ─── Helpers ────────────────────────────────────────────────────────────────

function decryptPassword(encrypted: string, masterKey: string): string {
  // Format: iv:authTag:encrypted (hex)
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
  
  // Extract certificate
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certs = certBags[forge.pki.oids.certBag];
  if (!certs || certs.length === 0) throw new Error("No certificate found in PFX");
  
  // Extract private key
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
  // DPS ID: Código IBGE (7) + Tipo Inscrição (1) + Inscrição Federal (14) + Série (5) + Número (15)
  const ibge = padLeft(cityCode, 7);
  const tipo = docType; // 1=CNPJ, 2=CPF
  const inscricao = padLeft(formatDocument(document), 14);
  const serie = padLeft(series, 5);
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
  const netValue = Number(invoice.net_value || 0).toFixed(2);

  // Tax regime mapping
  const taxRegimeMap: Record<number, string> = { 1: "1", 2: "2", 3: "3", 4: "4" };
  const regEspTrib = invoice.special_tax_regime || "0";

  // ISSQN exemption type
  let issqnExigType = "1"; // Exigível
  if (invoice.issqn_suspended) issqnExigType = "3"; // Suspensa judicialmente
  else if (invoice.issqn_taxation === "imune") issqnExigType = "4";
  else if (invoice.issqn_taxation === "isenta") issqnExigType = "5";
  else if (invoice.issqn_taxation === "exportacao") issqnExigType = "6";
  else if (invoice.issqn_taxation === "nao_incidencia") issqnExigType = "2";

  const competenceDate = invoice.competence_date || new Date().toISOString().split("T")[0];
  const cityCode = company.address_city_code || "0000000";

  let xml = `<?xml version="1.0" encoding="UTF-8"?>`;
  xml += `<DPS xmlns="${ns}" versao="1.00">`;
  xml += `<infDPS Id="DPS${dpsId}">`;
  
  // Identification
  xml += `<tpAmb>1</tpAmb>`; // 1=Produção
  xml += `<dhEmi>${new Date().toISOString()}</dhEmi>`;
  xml += `<verAplic>NFSE-FLOW-1.0</verAplic>`;
  xml += `<dCompet>${competenceDate}</dCompet>`;
  
  // Subitem LC 116
  xml += `<subItemListaServico>${invoice.tax_code || ""}</subItemListaServico>`;
  
  // CNAE
  if (company.cnae_code) {
    xml += `<cCnae>${company.cnae_code}</cCnae>`;
  }
  
  // NBS
  if (invoice.nbs_code) {
    xml += `<CNBS>${invoice.nbs_code.replace(/\D/g, "")}</CNBS>`;
  }

  // Service description
  xml += `<xDescServ>${escapeXml(invoice.service_description || "")}</xDescServ>`;

  // Municipality
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
  // Calculate digest of infDPS
  const infDpsMatch = xml.match(/<infDPS[^>]*>[\s\S]*<\/infDPS>/);
  if (!infDpsMatch) throw new Error("infDPS element not found in XML");
  
  const infDps = infDpsMatch[0];
  const idMatch = infDps.match(/Id="([^"]+)"/);
  const referenceUri = idMatch ? `#${idMatch[1]}` : "";
  
  // Canonicalize (simplified - in production use proper C14N)
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
  
  // Build Signature element
  const signatureXml = `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    signedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo>` +
    `<X509Data>` +
    `<X509Certificate>${x509Certificate}</X509Certificate>` +
    `</X509Data>` +
    `</KeyInfo>` +
    `</Signature>`;
  
  // Insert before </DPS>
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

    // Decrypt password (supports both encrypted and plain text)
    let certPassword: string;
    const encParts = certRecord.password_encrypted.split(":");
    if (encParts.length === 3) {
      try {
        certPassword = decryptPassword(certRecord.password_encrypted, masterKey);
      } catch (e) {
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
      "1", // CNPJ
      company.document,
      invoice.rps_series || "RPS",
      rpsNumber
    );

    // Update RPS number
    await supabase.from("nfse_invoices").update({
      rps_number: rpsNumber,
      status: "processing",
    }).eq("id", invoice_id);

    // Log event: started
    await supabase.from("nfse_events").insert({
      invoice_id,
      tenant_id: invoice.tenant_id,
      event_type: "created",
      description: `Emissão iniciada. DPS ID: ${dpsId}`,
      created_by: userData.user.id,
    });

    // Generate XML
    const dpsXml = generateDPSXml(invoice, company, dpsId);

    // Log event: XML generated
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

    // Send to Sefin Nacional via mTLS
    let httpClient: Deno.HttpClient;
    try {
      httpClient = Deno.createHttpClient({
        cert: certPem,
        key: keyPem,
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
      const response = await fetch(`${SEFIN_BASE_URL}/nfse`, {
        method: "POST",
        headers: { "Content-Type": "application/xml" },
        body: signedXml,
        client: httpClient,
      } as any);

      const responseText = await response.text();

      await supabase.from("nfse_events").insert({
        invoice_id,
        tenant_id: invoice.tenant_id,
        event_type: "submitted",
        description: `Enviado à Sefin Nacional. Status HTTP: ${response.status}`,
        response_xml: responseText,
        created_by: userData.user.id,
      });

      if (response.ok) {
        // Parse response to extract chaveAcesso, protocol, etc.
        const chaveMatch = responseText.match(/<chNFSe>([^<]+)<\/chNFSe>/);
        const protocolMatch = responseText.match(/<nProt>([^<]+)<\/nProt>/);
        const nfseNumMatch = responseText.match(/<nNFSe>([^<]+)<\/nNFSe>/);
        const verCodeMatch = responseText.match(/<cVerif>([^<]+)<\/cVerif>/);

        await supabase.from("nfse_invoices").update({
          status: "authorized",
          xml_authorized: responseText,
          xml_response: responseText,
          protocol_number: protocolMatch ? protocolMatch[1] : null,
          invoice_number: nfseNumMatch ? parseInt(nfseNumMatch[1]) : null,
          verification_code: verCodeMatch ? verCodeMatch[1] : null,
          issued_at: new Date().toISOString(),
          metadata: {
            ...(invoice.metadata || {}),
            chave_acesso: chaveMatch ? chaveMatch[1] : null,
            dps_id: dpsId,
          },
        }).eq("id", invoice_id);

        await supabase.from("nfse_events").insert({
          invoice_id,
          tenant_id: invoice.tenant_id,
          event_type: "authorized",
          description: `NFS-e autorizada. ${chaveMatch ? `Chave: ${chaveMatch[1]}` : ""}`,
          created_by: userData.user.id,
        });

        return new Response(JSON.stringify({
          success: true,
          status: "authorized",
          chave_acesso: chaveMatch ? chaveMatch[1] : null,
          protocol: protocolMatch ? protocolMatch[1] : null,
          invoice_number: nfseNumMatch ? nfseNumMatch[1] : null,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Parse rejection
        const errorMatch = responseText.match(/<xMotivo>([^<]+)<\/xMotivo>/);
        const errorCodeMatch = responseText.match(/<cStat>([^<]+)<\/cStat>/);

        await supabase.from("nfse_invoices").update({
          status: "rejected",
          xml_response: responseText,
        }).eq("id", invoice_id);

        await supabase.from("nfse_events").insert({
          invoice_id,
          tenant_id: invoice.tenant_id,
          event_type: "rejected",
          error_code: errorCodeMatch ? errorCodeMatch[1] : String(response.status),
          error_message: errorMatch ? errorMatch[1] : responseText.substring(0, 500),
          response_xml: responseText,
          created_by: userData.user.id,
        });

        return new Response(JSON.stringify({
          success: false,
          status: "rejected",
          error_code: errorCodeMatch ? errorCodeMatch[1] : String(response.status),
          error_message: errorMatch ? errorMatch[1] : "Rejeição da DPS pela Sefin Nacional",
          response: responseText,
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
