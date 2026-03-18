import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface CertificateData {
  subject: string;
  issuer: string;
  serial_number: string;
  valid_from: string;
  valid_until: string;
  legal_name: string | null;
  document: string | null;
  password_encrypted: string;
}

function extractFromSubject(subject: any): { legal_name: string | null; document: string | null } {
  let legal_name: string | null = null;
  let document: string | null = null;

  // CN usually contains the company name or person name
  const cn = subject.getField("CN");
  if (cn) {
    const cnValue = cn.value as string;
    // Check if CN contains CNPJ pattern (XX.XXX.XXX/XXXX-XX or just digits)
    const cnpjMatch = cnValue.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
    if (cnpjMatch) {
      document = cnpjMatch[1];
      // Name is usually before the colon or CNPJ
      const namePart = cnValue.split(":")[0].trim();
      legal_name = namePart || null;
    } else {
      legal_name = cnValue;
    }
  }

  // Some certificates store CNPJ in serialNumber OID (2.5.4.5)
  const serialField = subject.getField({ shortName: "serialName" }) || subject.getField({ name: "serialNumber" });
  if (serialField && !document) {
    const serialValue = serialField.value as string;
    const cnpjMatch = serialValue.match(/(\d{14})/);
    if (cnpjMatch) {
      document = cnpjMatch[1];
    }
  }

  // OID 2.16.76.1.3.3 is specifically for CNPJ in ICP-Brasil certificates
  // Check all attributes for CNPJ-like values
  if (!document && subject.attributes) {
    for (const attr of subject.attributes) {
      const val = String(attr.value || "");
      const cnpjMatch = val.match(/(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/);
      if (cnpjMatch) {
        document = cnpjMatch[1];
        break;
      }
      // Also check for 14-digit sequences that could be CNPJs
      const rawMatch = val.match(/(\d{14})/);
      if (rawMatch) {
        document = rawMatch[1];
        break;
      }
    }
  }

  // Also check OU (Organizational Unit) for company name
  if (!legal_name) {
    const ou = subject.getField("OU");
    if (ou) {
      legal_name = ou.value as string;
    }
  }

  // Check O (Organization)
  if (!legal_name) {
    const o = subject.getField("O");
    if (o) {
      legal_name = o.value as string;
    }
  }

  return { legal_name, document };
}

function encryptPassword(password: string, masterKeyHex: string): string {
  // Ensure key is exactly 64 hex chars (32 bytes for AES-256)
  const cleanKey = masterKeyHex.trim();
  if (cleanKey.length !== 64) {
    throw new Error(`Invalid master key length: expected 64 hex chars, got ${cleanKey.length}`);
  }
  const key = forge.util.hexToBytes(cleanKey);
  const iv = forge.random.getBytesSync(12);
  const cipher = forge.cipher.createCipher("AES-GCM", key);
  cipher.start({ iv, tagLength: 128 });
  cipher.update(forge.util.createBuffer(password, "utf8"));
  cipher.finish();
  const encrypted = cipher.output.toHex();
  const tag = cipher.mode.tag.toHex();
  const ivHex = forge.util.bytesToHex(iv);
  return `${ivHex}:${tag}:${encrypted}`;
}
Deno.serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const masterKey = Deno.env.get("CERTIFICATE_MASTER_KEY");
    if (!masterKey) {
      return new Response(
        JSON.stringify({ error: "CERTIFICATE_MASTER_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const password = formData.get("password") as string | null;

    if (!file) {
      return new Response(
        JSON.stringify({ error: "Arquivo .pfx não enviado" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password) {
      return new Response(
        JSON.stringify({ error: "Senha do certificado não informada" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const binary = String.fromCharCode(...new Uint8Array(arrayBuffer));
    const asn1 = forge.asn1.fromDer(binary);

    let p12: any;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(asn1, password);
    } catch {
      return new Response(
        JSON.stringify({ error: "Senha do certificado incorreta ou arquivo inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract certificate bags
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
    const certs = certBags[forge.pki.oids.certBag];

    if (!certs || certs.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum certificado encontrado no arquivo" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the first certificate (usually the end-entity cert)
    const cert = certs[0].cert;
    const { legal_name, document } = extractFromSubject(cert.subject);

    const passwordEncrypted = encryptPassword(password, masterKey);

    const issuerCN = cert.issuer.getField("CN");

    const result: CertificateData = {
      subject: cert.subject.attributes.map((a: any) => `${a.shortName || a.name}=${a.value}`).join(", "),
      issuer: issuerCN ? issuerCN.value : cert.issuer.attributes.map((a: any) => `${a.shortName || a.name}=${a.value}`).join(", "),
      serial_number: cert.serialNumber,
      valid_from: cert.validity.notBefore.toISOString(),
      valid_until: cert.validity.notAfter.toISOString(),
      legal_name,
      document,
      password_encrypted: passwordEncrypted,
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error parsing certificate:", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: `Erro ao processar certificado: ${message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
