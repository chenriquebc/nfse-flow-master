import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SEFIN_HOST = "sefin.nfse.gov.br";

// ─── mTLS fetch using Deno HttpClient (edge-runtime compatible) ─────────────

async function mtlsFetch(
  method: string,
  path: string,
  body: string | null,
  certPem: string,
  keyPem: string,
  contentType = "application/xml",
): Promise<{ status: number; body: string }> {
  const httpClient = Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
    http1: true,
    http2: false,
  });

  try {
    const headers: Record<string, string> = {
      "Accept": "application/xml",
    };
    if (contentType && body) headers["Content-Type"] = contentType;

    const requestInit: RequestInit & { client: Deno.HttpClient } = {
      method,
      headers,
      client: httpClient,
    };

    if (body) requestInit.body = body;

    const response = await fetch(`https://${SEFIN_HOST}${path}`, requestInit);
    const responseBody = await response.text();

    return {
      status: response.status,
      body: responseBody,
    };
  } finally {
    httpClient.close();
  }
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

  return {
    certPem: allCertsPem,
    keyPem: forge.pki.privateKeyToPem(keys[0].key as forge.pki.rsa.PrivateKey),
  };
}

async function getCertPems(supabase: any, companyId: string, masterKey: string) {
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

      const { certPem, keyPem } = await getCertPems(supabase, invoice.company_id, masterKey);

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

      const { certPem, keyPem } = await getCertPems(supabase, invoice.company_id, masterKey);

      const cancelXml = `<?xml version="1.0" encoding="UTF-8"?>
<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">
  <infPedReg>
    <tpAmb>1</tpAmb>
    <verAplic>NFSE-FLOW-1.0</verAplic>
    <dhEvento>${new Date().toISOString()}</dhEvento>
    <nSeqEvento>1</nSeqEvento>
    <chNFSe>${chave}</chNFSe>
    <tpEvento>e101101</tpEvento>
    <detEvento>
      <e101101>
        <xMotivo>${body.reason || "Cancelamento solicitado pelo emitente"}</xMotivo>
      </e101101>
    </detEvento>
  </infPedReg>
</pedRegEvento>`;

      const result = await mtlsFetch(
        "POST",
        `/SefinNacional/nfse/${chave}/eventos`,
        cancelXml,
        certPem,
        keyPem,
      );

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
