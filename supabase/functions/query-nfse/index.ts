import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SEFIN_HOST = "sefin.nfse.gov.br";

// ─── mTLS fetch via external proxy ─────────────────────────────────────────

async function mtlsFetch(
  method: string,
  path: string,
  body: string | null,
  certPem: string,
  keyPem: string,
  contentType = "application/xml",
): Promise<{ status: number; body: string }> {
  let proxyUrl = Deno.env.get("MTLS_PROXY_URL");
  const proxyToken = Deno.env.get("MTLS_PROXY_TOKEN");

  if (!proxyUrl || !proxyToken) {
    throw new Error("MTLS_PROXY_URL and MTLS_PROXY_TOKEN must be configured");
  }

  // Ensure URL has protocol
  if (!proxyUrl.startsWith("http://") && !proxyUrl.startsWith("https://")) {
    proxyUrl = `https://${proxyUrl}`;
  }

  const proxyResponse = await fetch(`${proxyUrl}/proxy`, {
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

function loadCertAndKey(pfxBinary: string, password: string) {
  const asn1 = forge.asn1.fromDer(pfxBinary);
  const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);

  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
  const certs = certBags[forge.pki.oids.certBag];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
  const keys = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

  if (!certs?.length || !keys?.length) throw new Error("Invalid certificate");

  const allCertsPem = certs
    .filter((b: any) => b.cert)
    .map((b: any) => forge.pki.certificateToPem(b.cert))
    .join("\n");

  const privateKey = keys[0].key as forge.pki.rsa.PrivateKey;
  const cert = certs.find((b: any) => b.cert)!.cert as forge.pki.Certificate;

  return {
    certPem: allCertsPem,
    keyPem: forge.pki.privateKeyToPem(privateKey),
    privateKey,
    cert,
  };
}

async function getCertPemsAndKeys(supabase: any, companyId: string, masterKey: string) {
  const { data: certRecord } = await supabase
    .from("certificates")
    .select("*")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!certRecord) throw new Error("No certificate found");

  const { data: fileData } = await supabase.storage
    .from("certificates")
    .download(certRecord.file_path);
  if (!fileData) throw new Error("Failed to download certificate");

  let certPassword: string;
  const encParts = certRecord.password_encrypted.split(":");
  if (encParts.length === 3) {
    try {
      certPassword = decryptPassword(certRecord.password_encrypted, masterKey);
    } catch {
      certPassword = certRecord.password_encrypted;
    }
  } else {
    certPassword = certRecord.password_encrypted;
  }

  const arrayBuffer = await fileData.arrayBuffer();
  const pfxBinary = String.fromCharCode(...new Uint8Array(arrayBuffer));
  return loadCertAndKey(pfxBinary, certPassword);
}

// ─── XML Signing for Events ─────────────────────────────────────────────

function normalizeXmlForSignature(xml: string): string {
  let normalized = xml
    .replace(/\r\n?/g, "\n")
    .replace(/>\s+</g, "><")
    .trim();

  const selfClosingTagRegex = /<([A-Za-z_][\w:.-]*)([^>]*)\/>/g;
  let previous = "";
  while (previous !== normalized) {
    previous = normalized;
    normalized = normalized.replace(selfClosingTagRegex, "<$1$2></$1>");
  }

  return normalized;
}

function canonicalizeInfPedReg(xml: string, ns: string): string {
  const infMatch = xml.match(/<infPedReg\b[^>]*>[\s\S]*?<\/infPedReg>/);
  if (!infMatch) {
    throw new Error("infPedReg not found in event XML");
  }

  let infPedReg = infMatch[0];
  if (!/\sxmlns="[^"]+"/.test(infPedReg)) {
    infPedReg = infPedReg.replace("<infPedReg", `<infPedReg xmlns="${ns}"`);
  }

  return normalizeXmlForSignature(infPedReg);
}

function signEventXml(xml: string, privateKey: forge.pki.rsa.PrivateKey, cert: forge.pki.Certificate, eventId: string): string {
  const ns = "http://www.sped.fazenda.gov.br/nfse";
  const canonicalized = canonicalizeInfPedReg(xml, ns);

  const digestMd = forge.md.sha256.create();
  digestMd.update(canonicalized, "utf8");
  const digestValue = forge.util.encode64(digestMd.digest().bytes());

  const signedInfoXml =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod>` +
    `<Reference URI="#${eventId}">` +
    `<Transforms>` +
    `<Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"></Transform>` +
    `<Transform Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></Transform>` +
    `</Transforms>` +
    `<DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"></DigestMethod>` +
    `<DigestValue>${digestValue}</DigestValue>` +
    `</Reference>` +
    `</SignedInfo>`;

  const canonicalizedSignedInfo = normalizeXmlForSignature(signedInfoXml);

  const signMd = forge.md.sha256.create();
  signMd.update(canonicalizedSignedInfo, "utf8");
  const signature = privateKey.sign(signMd);
  const signatureValue = forge.util.encode64(signature);

  const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(cert)).bytes();
  const x509Certificate = forge.util.encode64(certDer);

  const signatureXml =
    `<Signature xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    canonicalizedSignedInfo +
    `<SignatureValue>${signatureValue}</SignatureValue>` +
    `<KeyInfo>` +
    `<X509Data>` +
    `<X509Certificate>${x509Certificate}</X509Certificate>` +
    `</X509Data>` +
    `</KeyInfo>` +
    `</Signature>`;

  return xml.replace("</pedRegEvento>", `${signatureXml}</pedRegEvento>`);
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

    const body = await req.json();
    const { action, invoice_id, chave_acesso } = body;

    if (action === "query_by_key" && chave_acesso) {
      const { data: invoice } = await supabase
        .from("nfse_invoices")
        .select("*")
        .eq("id", invoice_id)
        .single();

      if (!invoice) {
        return new Response(JSON.stringify({ error: "Invoice not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { certPem, keyPem } = await getCertPemsAndKeys(supabase, invoice.company_id, masterKey);

      const result = await mtlsFetch(
        "GET",
        `/SefinNacional/nfse/${chave_acesso}`,
        null,
        certPem,
        keyPem,
      );

      await supabase.from("nfse_events").insert({
        invoice_id,
        tenant_id: invoice.tenant_id,
        event_type: "batch_queried",
        description: `Consulta NFS-e por chave. Status: ${result.status}`,
        response_xml: result.body,
        created_by: userData.user.id,
      });

      return new Response(JSON.stringify({
        success: result.status >= 200 && result.status < 300,
        status: result.status,
        data: result.body,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "cancel" && invoice_id) {
      const { data: invoice } = await supabase
        .from("nfse_invoices")
        .select("*")
        .eq("id", invoice_id)
        .single();

      if (!invoice || invoice.status !== "authorized") {
        return new Response(JSON.stringify({ error: "Only authorized invoices can be cancelled" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chave = (invoice.metadata as any)?.chave_acesso;
      if (!chave) {
        return new Response(JSON.stringify({ error: "No access key found for this invoice" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { certPem, keyPem, cert, privateKey } = await getCertPemsAndKeys(supabase, invoice.company_id, masterKey);

      // Build cancel event XML (pedRegEvento)
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
      const dhEvento = `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth() + 1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}:${pad(brt.getUTCSeconds())}-03:00`;
      const reason = body.reason || "Cancelamento solicitado pelo emitente";
      const nSeqEvento = "001";
      const eventId = `IDe101101${chave}${nSeqEvento}`;

      const cancelXml = `<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00"><infPedReg Id="${eventId}"><tpAmb>1</tpAmb><verAplic>NFSE-FLOW-1.0</verAplic><dhEvento>${dhEvento}</dhEvento><nSeqEvento>1</nSeqEvento><chNFSe>${chave}</chNFSe><tpEvento>e101101</tpEvento><detEvento><e101101><xMotivo>${reason}</xMotivo></e101101></detEvento></infPedReg></pedRegEvento>`;

      // Sign the cancel XML
      const signedCancelXml = signEventXml(cancelXml, privateKey, cert, eventId);

      console.log(`[cancel] eventId=${eventId}`);
      console.log(`[cancel] Raw XML (first 600): ${signedCancelXml.substring(0, 600)}`);

      // GZip + Base64 encode
      const xmlBytes = new TextEncoder().encode(signedCancelXml);
      const cs = new CompressionStream("gzip");
      const csWriter = cs.writable.getWriter();
      csWriter.write(xmlBytes);
      csWriter.close();
      const gzippedBuf = await new Response(cs.readable).arrayBuffer();
      const gzippedBytes = new Uint8Array(gzippedBuf);
      let binaryStr = "";
      for (let i = 0; i < gzippedBytes.length; i++) {
        binaryStr += String.fromCharCode(gzippedBytes[i]);
      }
      const pedRegEventoXmlGZipB64 = btoa(binaryStr);

      // Send as JSON to SEFIN eventos endpoint
      const jsonPayload = JSON.stringify({ pedRegEventoXmlGZipB64 });

      console.log(`[cancel] Sending JSON to SEFIN: POST /SefinNacional/nfse/${chave}/eventos (${jsonPayload.length} bytes)`);

      const result = await mtlsFetch(
        "POST",
        `/SefinNacional/nfse/${chave}/eventos`,
        jsonPayload,
        certPem,
        keyPem,
        "application/json",
      );

      console.log(`[cancel] SEFIN response: ${result.status} - ${result.body.substring(0, 500)}`);

      if (result.status >= 200 && result.status < 300) {
        await supabase.from("nfse_invoices").update({ status: "cancelled" }).eq("id", invoice_id);
        await supabase.from("nfse_events").insert({
          invoice_id,
          tenant_id: invoice.tenant_id,
          event_type: "cancelled",
          description: "NFS-e cancelada com sucesso",
          response_xml: result.body,
          created_by: userData.user.id,
        });
      } else {
        await supabase.from("nfse_events").insert({
          invoice_id,
          tenant_id: invoice.tenant_id,
          event_type: "error",
          error_message: `Cancel failed: ${result.status}`,
          error_code: String(result.status),
          response_xml: result.body,
          created_by: userData.user.id,
        });
      }

      return new Response(JSON.stringify({
        success: result.status >= 200 && result.status < 300,
        status: result.status,
        data: result.body,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use 'query_by_key' or 'cancel'" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Error in query-nfse:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
