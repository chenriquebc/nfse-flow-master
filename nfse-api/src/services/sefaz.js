const axios = require("axios");
const { parseStringPromise } = require("xml2js");
const { getWebserviceUrls, NAMESPACES } = require("../config/sefaz");
const { createMtlsAgent } = require("./certificate");

/**
 * Envia uma requisição SOAP para a SEFAZ com mTLS.
 *
 * @param {string} servico - Nome do webservice (ex: "NFeAutorizacao")
 * @param {string} soapXml - XML SOAP completo
 * @param {Object} options - { cUF, tpAmb, certPem?, keyPem? }
 * @returns {Promise<{ status: number, xml: string, parsed: Object }>}
 */
async function enviarSoap(servico, soapXml, options) {
  const { cUF, tpAmb, certPem, keyPem } = options;
  const urls = getWebserviceUrls(cUF, tpAmb);
  const url = urls[servico];

  if (!url) {
    throw new Error(`Webservice ${servico} não configurado para UF ${cUF}`);
  }

  const httpsAgent = createMtlsAgent({ certPem, keyPem });

  const soapAction = getSoapAction(servico);

  console.log(`[SEFAZ] ${servico} → ${url}`);
  console.log(`[SEFAZ] SOAPAction: ${soapAction}`);

  try {
    const response = await axios({
      method: "POST",
      url,
      data: soapXml,
      httpsAgent,
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "SOAPAction": soapAction,
      },
      timeout: 60000,
      maxRedirects: 0,
      validateStatus: () => true, // Accept any status
    });

    console.log(`[SEFAZ] Response status: ${response.status}`);

    let parsed = null;
    try {
      parsed = await parseStringPromise(response.data, {
        explicitArray: false,
        ignoreAttrs: false,
        tagNameProcessors: [(name) => name.replace(/^.*:/, "")], // Remove namespace prefix
      });
    } catch (parseErr) {
      console.warn("[SEFAZ] Falha ao parsear resposta XML:", parseErr.message);
    }

    return {
      status: response.status,
      xml: response.data,
      parsed,
    };
  } catch (err) {
    console.error(`[SEFAZ] Erro na requisição:`, err.message);

    if (err.code === "ECONNRESET" || err.code === "ECONNREFUSED") {
      throw new Error(
        `Falha na conexão mTLS com SEFAZ (${err.code}). Verifique o certificado digital.`
      );
    }

    throw err;
  }
}

/**
 * Retorna a SOAPAction correta para cada webservice.
 */
function getSoapAction(servico) {
  const actions = {
    NFeAutorizacao: `${NAMESPACES.wsdl}/NFeAutorizacao4/nfeAutorizacaoLote`,
    NFeRetAutorizacao: `${NAMESPACES.wsdl}/NFeRetAutorizacao4/nfeRetAutorizacaoLote`,
    NFeStatusServico: `${NAMESPACES.wsdl}/NFeStatusServico4/nfeStatusServicoNF`,
    NFeConsultaProtocolo: `${NAMESPACES.wsdl}/NFeConsultaProtocolo4/nfeConsultaNF`,
    RecepcaoEvento: `${NAMESPACES.wsdl}/NFeRecepcaoEvento4/nfeRecepcaoEvento`,
  };

  return actions[servico] || "";
}

/**
 * Extrai informações relevantes da resposta da SEFAZ.
 */
function extrairRespostaSefaz(parsed) {
  if (!parsed) return null;

  try {
    // Navegar na estrutura SOAP até o conteúdo
    const body =
      parsed?.Envelope?.Body ||
      parsed?.["soap:Envelope"]?.["soap:Body"] ||
      parsed;

    // Tentar encontrar o retorno
    const resultado =
      body?.nfeResultMsg ||
      body?.nfeAutorizacaoLoteResult ||
      body?.nfeRetAutorizacaoLoteResult ||
      body?.nfeStatusServicoNFResult ||
      body?.nfeConsultaNFResult ||
      body?.nfeRecepcaoEventoResult ||
      body;

    // Extrair campos comuns
    const retorno = resultado?.retEnviNFe || resultado?.retConsStatServ || resultado?.retConsSitNFe || resultado?.retEnvEvento || resultado;

    return {
      cStat: retorno?.cStat || retorno?.protNFe?.infProt?.cStat,
      xMotivo: retorno?.xMotivo || retorno?.protNFe?.infProt?.xMotivo,
      nRec: retorno?.infRec?.nRec,
      dhRecbto: retorno?.dhRecbto || retorno?.protNFe?.infProt?.dhRecbto,
      nProt: retorno?.protNFe?.infProt?.nProt,
      chNFe: retorno?.protNFe?.infProt?.chNFe,
      tpAmb: retorno?.tpAmb,
      cUF: retorno?.cUF,
      raw: retorno,
    };
  } catch {
    return null;
  }
}

// ─── Funções de alto nível ──────────────────────────────────

/**
 * Consulta o status do serviço SEFAZ.
 */
async function consultarStatusServico(soapXml, options) {
  return enviarSoap("NFeStatusServico", soapXml, options);
}

/**
 * Envia lote de NF-e para autorização.
 */
async function autorizarNFe(soapXml, options) {
  return enviarSoap("NFeAutorizacao", soapXml, options);
}

/**
 * Consulta retorno de autorização por recibo.
 */
async function consultarRecibo(soapXml, options) {
  return enviarSoap("NFeRetAutorizacao", soapXml, options);
}

/**
 * Consulta NF-e por chave de acesso.
 */
async function consultarChave(soapXml, options) {
  return enviarSoap("NFeConsultaProtocolo", soapXml, options);
}

/**
 * Envia evento (cancelamento, carta de correção, etc).
 */
async function enviarEvento(soapXml, options) {
  return enviarSoap("RecepcaoEvento", soapXml, options);
}

module.exports = {
  enviarSoap,
  consultarStatusServico,
  autorizarNFe,
  consultarRecibo,
  consultarChave,
  enviarEvento,
  extrairRespostaSefaz,
};
