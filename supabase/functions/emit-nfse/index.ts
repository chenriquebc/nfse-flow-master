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
  const tipo = docType;
  const inscricao = padLeft(formatDocument(document), 14);
  const numericSeries = series.replace(/\D/g, "") || "1";
  const serie = padLeft(numericSeries, 5);
  const num = padLeft(number, 15);
  return `${ibge}${tipo}${inscricao}${serie}${num}`;
}

// ─── DPS XML Generation ────────────────────────────────────────────────────

async function generateDPSXml(invoice: any, company: any, dpsId: string): Promise<string> {
  const ns = "http://www.sped.fazenda.gov.br/nfse";

  const onlyDigits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
  const normalizeText = (value: unknown) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  const isLikelyIbge = (value: unknown) => /^\d{7}$/.test(onlyDigits(value)) && !onlyDigits(value).startsWith("00");

  const resolveIbgeCityCode = async (city: unknown, uf: unknown): Promise<string> => {
    const cityNorm = normalizeText(city);
    const ufNorm = String(uf ?? "").trim().toUpperCase();

    if (!cityNorm || ufNorm.length !== 2) return "";

    try {
      const res = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(ufNorm)}/municipios`);
      if (!res.ok) return "";

      const data = await res.json();
      if (!Array.isArray(data)) return "";

      const found = data.find((m: any) => normalizeText(m?.nome) === cityNorm);
      const ibge = onlyDigits(found?.id);
      return /^\d{7}$/.test(ibge) ? ibge : "";
    } catch {
      return "";
    }
  };

  const normIbge = (value: unknown, fallback = "0000000") => {
    const digits = onlyDigits(value);
    if (digits.length === 7) return digits;
    if (digits.length > 7) return digits.slice(0, 7);
    if (digits.length > 0) return digits.padStart(7, "0").slice(-7);
    return fallback;
  };
  const normCep = (value: unknown) => {
    const digits = onlyDigits(value);
    if (digits.length === 8) return digits;
    if (digits.length > 8) return digits.slice(0, 8);
    if (digits.length > 0) return digits.padStart(8, "0").slice(-8);
    return "00000000";
  };
  const normPhone = (value: unknown) => {
    const digits = onlyDigits(value);
    return digits.length >= 6 && digits.length <= 20 ? digits : "";
  };
  const toMoney = (value: unknown) => Number(value || 0).toFixed(2);
  const toRate = (value: unknown) => {
    const n = Math.min(Math.max(Number(value || 0), 0), 9.99);
    return n.toFixed(2);
  };

  const regEspMap: Record<string, string> = {
    microempresa_municipal: "3",
    estimativa: "2",
    sociedade_profissionais: "6",
    cooperativa: "1",
    mei: "5",
    me_epp: "0",
    nenhum: "0",
    "0": "0",
  };
  const pisCofinsRetMap: Record<string, string> = {
    nao_retido: "0",
    retido: "3",
    pis_cofins_retido_csll_nao: "4",
    pis_retido_cofins_csll_nao: "5",
    cofins_retido_pis_csll_nao: "6",
  };
  const tribIssqnMap: Record<string, string> = {
    tributavel: "1",
    imune: "2",
    exportacao: "3",
    nao_incidencia: "4",
    isenta: "4",
  };

  const serviceCityCode = normIbge(invoice.service_city_code || invoice.issqn_city || company.address_city_code);
  const companyCityCode = normIbge(company.address_city_code, serviceCityCode);

  let takerCityCode = isLikelyIbge(invoice.taker_address_city_code)
    ? onlyDigits(invoice.taker_address_city_code).slice(0, 7)
    : "";

  if (!takerCityCode) {
    takerCityCode = await resolveIbgeCityCode(invoice.taker_address_city, invoice.taker_address_state);
  }

  if (!takerCityCode) {
    takerCityCode = normIbge(invoice.taker_address_city_code, serviceCityCode);
  }

  console.log("City code resolution", {
    taker_address_city: invoice.taker_address_city,
    taker_address_state: invoice.taker_address_state,
    taker_address_city_code: invoice.taker_address_city_code,
    takerCityCode,
  });

  const taxCodeDigits = onlyDigits(invoice.tax_code);
  const municipalDigits = onlyDigits(invoice.municipal_tax_code);
  const cTribMun = municipalDigits ? municipalDigits.slice(-3).padStart(3, "0") : "";

  // Códigos de tributação nacional válidos para os itens usados no frontend.
  // Evita rejeição E0310 por montagem inválida do desdobro.
  const validNationalTribCodesByItem: Record<string, string[]> = {
    "0101": ["010101"],
    "0102": ["010201"],
    "0103": ["010301", "010302"],
    "0104": ["010401"],
    "0105": ["010501"],
    "0106": ["010601"],
    "0107": ["010701"],
    "0108": ["010801"],
    "0109": ["010901", "010902"],
    "0201": ["020101"],
    "0701": ["070101"],
    "0702": ["070201"],
    "0703": ["070301"],
    "1001": ["100101"],
    "1002": ["100201"],
    "1005": ["100501"],
    "1401": ["140101"],
    "1701": ["170101"],
    "1702": ["170201"],
    "1704": ["170401"],
    "1705": ["170501"],
    "1706": ["170601"],
    "1719": ["171901"],
    "1720": ["172001"],
    "1722": ["172201"],
    "2501": ["250101"],
    "2502": ["250201"],
    "2503": ["250301"],
    "2504": ["250401"],
  };

  const cTribNac = (() => {
    if (taxCodeDigits.length >= 6) return taxCodeDigits.slice(0, 6);

    if (taxCodeDigits.length === 4) {
      const allowed = validNationalTribCodesByItem[taxCodeDigits];
      const desiredSuffix = (cTribMun || "001").slice(-2).padStart(2, "0");
      const desired = `${taxCodeDigits}${desiredSuffix === "00" ? "01" : desiredSuffix}`;

      if (allowed?.length) {
        return allowed.includes(desired) ? desired : allowed[0];
      }

      return `${taxCodeDigits}01`;
    }

    return taxCodeDigits.padEnd(6, "0").slice(0, 6);
  })();

  const cNbsDigits = onlyDigits(invoice.nbs_code);
  const cNBS = cNbsDigits.length >= 9 ? cNbsDigits.slice(0, 9) : "";

  const takerDoc = formatDocument(invoice.taker_document);
  const takerName = String(invoice.taker_name || "").trim() || "TOMADOR NAO INFORMADO";

  const serviceValue = Number(invoice.service_value || 0);
  const intermediaryValue = Number(invoice.intermediary_value || 0);
  const deductionValue = Number(invoice.deduction_value || 0);
  const unconditionalDiscount = Number(invoice.unconditional_discount || 0);
  const conditionalDiscount = Number(invoice.conditional_discount || 0);

  const competenceDate = invoice.competence_date || new Date().toISOString().split("T")[0];
  const regApTribSN = ["1", "2", "3"].includes(String(invoice.tax_assessment_regime))
    ? String(invoice.tax_assessment_regime)
    : "1";
  const regEspTrib = regEspMap[String(invoice.special_tax_regime || "0")] || "0";
  const tribISSQN = tribIssqnMap[String(invoice.issqn_taxation || "tributavel")] || "1";

  let tpRetISSQN = "1";
  if (invoice.issqn_retained_by_taker || invoice.iss_retained) tpRetISSQN = "2";

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const dhEmi = `${brt.getUTCFullYear()}-${pad(brt.getUTCMonth() + 1)}-${pad(brt.getUTCDate())}T${pad(brt.getUTCHours())}:${pad(brt.getUTCMinutes())}:${pad(brt.getUTCSeconds())}-03:00`;

  const serieDigits = onlyDigits(invoice.rps_series || "1") || "1";
  const nDps = Number(invoice.rps_number || 1);

  const xml: string[] = [];
  const push = (value: string) => xml.push(value);

  const pushEnderecoNacional = (
    cityCode: string,
    zipCode: string,
    street: string,
    number: string,
    complement?: string,
    neighborhood?: string,
  ) => {
    push("<end>");
    push("<endNac>");
    push(`<cMun>${cityCode}</cMun>`);
    push(`<CEP>${zipCode}</CEP>`);
    push("</endNac>");
    push(`<xLgr>${escapeXml(street || "NAO INFORMADO")}</xLgr>`);
    push(`<nro>${escapeXml(number || "S/N")}</nro>`);
    if (complement) push(`<xCpl>${escapeXml(complement)}</xCpl>`);
    push(`<xBairro>${escapeXml(neighborhood || "NAO INFORMADO")}</xBairro>`);
    push("</end>");
  };

  push(`<?xml version="1.0" encoding="UTF-8"?>`);
  push(`<DPS xmlns="${ns}" versao="1.00">`);
  push(`<infDPS Id="DPS${dpsId}">`);
  push(`<tpAmb>1</tpAmb>`);
  push(`<dhEmi>${dhEmi}</dhEmi>`);
  push(`<verAplic>NFSE-FLOW-1.0</verAplic>`);
  push(`<serie>${Number(serieDigits)}</serie>`);
  push(`<nDPS>${nDps}</nDPS>`);
  push(`<dCompet>${competenceDate}</dCompet>`);
  push(`<tpEmit>1</tpEmit>`);
  push(`<cLocEmi>${companyCityCode}</cLocEmi>`);

  // Prestador
  push("<prest>");
  push(`<CNPJ>${padLeft(formatDocument(company.document), 14)}</CNPJ>`);
  if (company.municipal_registration) push(`<IM>${escapeXml(String(company.municipal_registration))}</IM>`);
  push(`<xNome>${escapeXml(company.legal_name || "")}</xNome>`);
  if (company.address_street) {
    pushEnderecoNacional(
      companyCityCode,
      normCep(company.address_zip),
      String(company.address_street),
      String(company.address_number || "S/N"),
      company.address_complement ? String(company.address_complement) : undefined,
      company.address_neighborhood ? String(company.address_neighborhood) : undefined,
    );
  }
  const companyPhone = normPhone(company.phone);
  if (companyPhone) push(`<fone>${companyPhone}</fone>`);
  if (company.email) push(`<email>${escapeXml(String(company.email).slice(0, 80))}</email>`);
  push("<regTrib>");
  push(`<opSimpNac>3</opSimpNac>`);
  push(`<regApTribSN>${regApTribSN}</regApTribSN>`);
  push(`<regEspTrib>${regEspTrib}</regEspTrib>`);
  push("</regTrib>");
  push("</prest>");

  // Tomador
  push("<toma>");
  if (takerDoc.length > 11) {
    push(`<CNPJ>${padLeft(takerDoc, 14)}</CNPJ>`);
  } else {
    push(`<CPF>${padLeft(takerDoc || "0", 11)}</CPF>`);
  }
  push(`<xNome>${escapeXml(takerName)}</xNome>`);
  if (invoice.taker_address_street) {
    pushEnderecoNacional(
      takerCityCode,
      normCep(invoice.taker_address_zip),
      String(invoice.taker_address_street),
      String(invoice.taker_address_number || "S/N"),
      undefined,
      invoice.taker_address_city ? String(invoice.taker_address_city) : "NAO INFORMADO",
    );
  }
  const takerPhone = normPhone(invoice.taker_phone);
  if (takerPhone) push(`<fone>${takerPhone}</fone>`);
  if (invoice.taker_email) push(`<email>${escapeXml(String(invoice.taker_email).slice(0, 80))}</email>`);
  push("</toma>");

  // Intermediário
  if (invoice.intermediary_type && invoice.intermediary_type !== "none" && invoice.intermediary_document) {
    push("<interm>");
    const intermDoc = formatDocument(invoice.intermediary_document);
    if (intermDoc.length > 11) push(`<CNPJ>${padLeft(intermDoc, 14)}</CNPJ>`);
    else push(`<CPF>${padLeft(intermDoc, 11)}</CPF>`);
    if (invoice.intermediary_name) push(`<xNome>${escapeXml(invoice.intermediary_name)}</xNome>`);
    push("</interm>");
  }

  // Serviço (ordem exata do XSD)
  push("<serv>");
  push("<locPrest>");
  push(`<cLocPrestacao>${serviceCityCode}</cLocPrestacao>`);
  push("</locPrest>");
  push("<cServ>");
  push(`<cTribNac>${cTribNac}</cTribNac>`);
  if (cTribMun) push(`<cTribMun>${cTribMun}</cTribMun>`);
  push(`<xDescServ>${escapeXml(String(invoice.service_description || "SERVICO PRESTADO"))}</xDescServ>`);
  if (cNBS) push(`<cNBS>${cNBS}</cNBS>`);
  push("</cServ>");
  push("</serv>");

  // Valores e tributos (ordem exata do XSD)
  push("<valores>");
  push("<vServPrest>");
  if (intermediaryValue > 0) push(`<vReceb>${toMoney(intermediaryValue)}</vReceb>`);
  push(`<vServ>${toMoney(serviceValue)}</vServ>`);
  push("</vServPrest>");

  if (unconditionalDiscount > 0 || conditionalDiscount > 0) {
    push("<vDescCondIncond>");
    if (unconditionalDiscount > 0) push(`<vDescIncond>${toMoney(unconditionalDiscount)}</vDescIncond>`);
    if (conditionalDiscount > 0) push(`<vDescCond>${toMoney(conditionalDiscount)}</vDescCond>`);
    push("</vDescCondIncond>");
  }

  if (deductionValue > 0) {
    push("<vDedRed>");
    push(`<vDR>${toMoney(deductionValue)}</vDR>`);
    push("</vDedRed>");
  }

  push("<trib>");
  push("<tribMun>");
  push(`<tribISSQN>${tribISSQN}</tribISSQN>`);
  push("<cPaisResult>BR</cPaisResult>");
  push(`<tpRetISSQN>${tpRetISSQN}</tpRetISSQN>`);
  if (Number(invoice.iss_rate || 0) > 0) push(`<pAliq>${toRate(invoice.iss_rate)}</pAliq>`);
  push("</tribMun>");

  const hasFederal =
    !!invoice.pis_cofins_situation ||
    Number(invoice.social_security_retained || 0) > 0 ||
    Number(invoice.irrf_value || 0) > 0 ||
    Number(invoice.csll_value || 0) > 0 ||
    Number(invoice.social_contributions_retained || 0) > 0;

  if (hasFederal) {
    push("<tribFed>");

    if (invoice.pis_cofins_situation) {
      const basePisCofins = Number(invoice.base_value || invoice.service_value || 0);
      const pis = Number(invoice.pis_value || 0);
      const cofins = Number(invoice.cofins_value || 0);
      push("<piscofins>");
      push(`<CST>${String(invoice.pis_cofins_situation).padStart(2, "0")}</CST>`);
      if (basePisCofins > 0) push(`<vBCPisCofins>${toMoney(basePisCofins)}</vBCPisCofins>`);
      if (basePisCofins > 0 && pis > 0) push(`<pAliqPis>${toRate((pis * 100) / basePisCofins)}</pAliqPis>`);
      if (basePisCofins > 0 && cofins > 0) push(`<pAliqCofins>${toRate((cofins * 100) / basePisCofins)}</pAliqCofins>`);
      if (pis > 0) push(`<vPis>${toMoney(pis)}</vPis>`);
      if (cofins > 0) push(`<vCofins>${toMoney(cofins)}</vCofins>`);
      if (invoice.pis_cofins_csll_retention_type) {
        const tpRet = pisCofinsRetMap[String(invoice.pis_cofins_csll_retention_type)] ?? "0";
        push(`<tpRetPisCofins>${tpRet}</tpRetPisCofins>`);
      }
      push("</piscofins>");
    }

    if (Number(invoice.social_security_retained || 0) > 0) {
      push(`<vRetCP>${toMoney(invoice.social_security_retained)}</vRetCP>`);
    }
    if (Number(invoice.irrf_value || 0) > 0) {
      push(`<vRetIRRF>${toMoney(invoice.irrf_value)}</vRetIRRF>`);
    }
    const vRetCsll = Number(invoice.csll_value || invoice.social_contributions_retained || 0);
    if (vRetCsll > 0) {
      push(`<vRetCSLL>${toMoney(vRetCsll)}</vRetCSLL>`);
    }

    push("</tribFed>");
  }

  push("<totTrib>");
  push("<indTotTrib>0</indTotTrib>");
  push("</totTrib>");
  push("</trib>");
  push("</valores>");

  push("</infDPS>");
  push("</DPS>");

  return xml.join("");
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

function canonicalizeInfDPS(xml: string, ns: string): string {
  const infDpsMatch = xml.match(/<infDPS\b[^>]*>[\s\S]*?<\/infDPS>/);
  if (!infDpsMatch) {
    throw new Error("infDPS element not found in XML");
  }

  let infDps = infDpsMatch[0];
  if (!/\sxmlns="[^"]+"/.test(infDps)) {
    infDps = infDps.replace("<infDPS", `<infDPS xmlns="${ns}"`);
  }

  return normalizeXmlForSignature(infDps);
}

function signXml(xml: string, privateKey: forge.pki.rsa.PrivateKey, cert: forge.pki.Certificate): string {
  const ns = "http://www.sped.fazenda.gov.br/nfse";

  const canonicalizedInfDps = canonicalizeInfDPS(xml, ns);
  const idMatch = canonicalizedInfDps.match(/\sId="([^"]+)"/);
  if (!idMatch) {
    throw new Error("infDPS Id attribute is required for XML signature");
  }

  const digestMd = forge.md.sha256.create();
  digestMd.update(canonicalizedInfDps, "utf8");
  const digestValue = forge.util.encode64(digestMd.digest().bytes());

  const signedInfoXml =
    `<SignedInfo xmlns="http://www.w3.org/2000/09/xmldsig#">` +
    `<CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"></CanonicalizationMethod>` +
    `<SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"></SignatureMethod>` +
    `<Reference URI="#${idMatch[1]}">` +
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

  return xml.replace("</DPS>", `${signatureXml}</DPS>`);
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
      formatDocument(company.document).length > 11 ? "1" : "2",
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
    const dpsXml = await generateDPSXml(invoice, company, dpsId);

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
