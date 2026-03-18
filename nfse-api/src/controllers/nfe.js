const { v4: uuidv4 } = require("uuid");
const {
  gerarXmlNFe,
  gerarXmlStatusServico,
  gerarXmlEnvioLote,
  gerarXmlConsultaChave,
  gerarXmlCancelamento,
} = require("../services/xml-builder");
const { assinarNFe, assinarEvento } = require("../services/xml-signer");
const {
  autorizarNFe,
  consultarStatusServico,
  consultarChave,
  enviarEvento,
  extrairRespostaSefaz,
} = require("../services/sefaz");
const { loadCertificate } = require("../services/certificate");

/**
 * POST /nfe/emitir
 *
 * Recebe dados JSON da NF-e, gera XML, assina e envia para SEFAZ.
 */
async function emitir(req, res, next) {
  try {
    const dados = req.body;
    const { certPem, keyPem } = extractCertFromRequest(req);

    // Validação básica
    if (!dados.emitente) throw createError(400, "Dados do emitente são obrigatórios");
    if (!dados.destinatario) throw createError(400, "Dados do destinatário são obrigatórios");
    if (!dados.itens || !dados.itens.length) throw createError(400, "Pelo menos um item é obrigatório");

    const tpAmb = dados.tpAmb || parseInt(process.env.SEFAZ_AMBIENTE) || 2;
    const cUF = dados.cUF || parseInt(process.env.SEFAZ_UF_CODIGO) || 35;

    // 1. Gerar XML
    console.log("[NFe] Gerando XML...");
    const { xml: xmlNFe, chaveAcesso } = gerarXmlNFe({
      ...dados,
      tpAmb,
      cUF,
    });

    // 2. Assinar XML
    console.log("[NFe] Assinando XML...");
    const xmlAssinado = assinarNFe(xmlNFe, certPem, keyPem, chaveAcesso);

    // 3. Montar lote SOAP
    const idLote = String(Date.now()).slice(-15);
    console.log(`[NFe] Montando lote ${idLote}...`);
    const soapXml = gerarXmlEnvioLote(xmlAssinado, idLote);

    // 4. Enviar para SEFAZ
    console.log("[NFe] Enviando para SEFAZ...");
    const resultado = await autorizarNFe(soapXml, { cUF, tpAmb, certPem, keyPem });

    // 5. Extrair resposta
    const resposta = extrairRespostaSefaz(resultado.parsed);

    const isAutorizada =
      resposta?.cStat === "100" || // Autorizado
      resposta?.cStat === "104";   // Lote processado

    console.log(`[NFe] Resposta SEFAZ: cStat=${resposta?.cStat} - ${resposta?.xMotivo}`);

    res.json({
      success: isAutorizada,
      chaveAcesso,
      idLote,
      sefaz: {
        cStat: resposta?.cStat,
        xMotivo: resposta?.xMotivo,
        nProt: resposta?.nProt,
        dhRecbto: resposta?.dhRecbto,
        nRec: resposta?.nRec,
      },
      xml: {
        nfe: xmlNFe,
        assinado: xmlAssinado,
        soap: soapXml,
        resposta: resultado.xml,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /nfe/status
 *
 * Consulta o status do serviço SEFAZ.
 */
async function status(req, res, next) {
  try {
    const { certPem, keyPem } = extractCertFromRequest(req);
    const tpAmb = req.body.tpAmb || parseInt(process.env.SEFAZ_AMBIENTE) || 2;
    const cUF = req.body.cUF || parseInt(process.env.SEFAZ_UF_CODIGO) || 35;

    const soapXml = gerarXmlStatusServico(cUF, tpAmb);
    const resultado = await consultarStatusServico(soapXml, { cUF, tpAmb, certPem, keyPem });

    const resposta = extrairRespostaSefaz(resultado.parsed);

    res.json({
      success: resposta?.cStat === "107", // Serviço em operação
      sefaz: {
        cStat: resposta?.cStat,
        xMotivo: resposta?.xMotivo,
        tpAmb: resposta?.tpAmb,
        cUF: resposta?.cUF,
        dhRecbto: resposta?.dhRecbto,
      },
      xml: resultado.xml,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /nfe/:chave
 *
 * Consulta NF-e na SEFAZ por chave de acesso.
 */
async function consultar(req, res, next) {
  try {
    const { chave } = req.params;
    const { certPem, keyPem } = extractCertFromRequest(req);

    if (!chave || chave.length !== 44) {
      throw createError(400, "Chave de acesso deve ter 44 dígitos");
    }

    const tpAmb = parseInt(req.query.tpAmb || process.env.SEFAZ_AMBIENTE || "2");
    const cUF = parseInt(chave.substring(0, 2));

    const soapXml = gerarXmlConsultaChave(chave, tpAmb);
    const resultado = await consultarChave(soapXml, { cUF, tpAmb, certPem, keyPem });

    const resposta = extrairRespostaSefaz(resultado.parsed);

    res.json({
      success: resposta?.cStat === "100",
      sefaz: {
        cStat: resposta?.cStat,
        xMotivo: resposta?.xMotivo,
        nProt: resposta?.nProt,
        chNFe: resposta?.chNFe,
        dhRecbto: resposta?.dhRecbto,
      },
      xml: resultado.xml,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /nfe/cancelar
 *
 * Cancela uma NF-e autorizada.
 */
async function cancelar(req, res, next) {
  try {
    const { chNFe, nProt, xJust, CNPJ } = req.body;
    const { certPem, keyPem } = extractCertFromRequest(req);

    if (!chNFe) throw createError(400, "Chave de acesso (chNFe) é obrigatória");
    if (!nProt) throw createError(400, "Número do protocolo (nProt) é obrigatório");
    if (!xJust || xJust.length < 15) throw createError(400, "Justificativa (xJust) deve ter no mínimo 15 caracteres");
    if (!CNPJ) throw createError(400, "CNPJ do emitente é obrigatório");

    const tpAmb = req.body.tpAmb || parseInt(process.env.SEFAZ_AMBIENTE) || 2;
    const cUF = parseInt(chNFe.substring(0, 2));

    // Gerar XML do evento de cancelamento
    const xmlCancelamento = gerarXmlCancelamento({
      chNFe,
      nProt,
      xJust,
      CNPJ,
      tpAmb,
      cOrgao: cUF,
    });

    // Assinar evento
    const idEvento = `ID110111${chNFe}01`;
    const xmlAssinado = assinarEvento(xmlCancelamento, certPem, keyPem, idEvento);

    // Enviar para SEFAZ
    const resultado = await enviarEvento(xmlAssinado, { cUF, tpAmb, certPem, keyPem });
    const resposta = extrairRespostaSefaz(resultado.parsed);

    const isCancelada =
      resposta?.cStat === "135" || // Evento registrado e vinculado
      resposta?.cStat === "155";   // Cancelamento homologado

    res.json({
      success: isCancelada,
      sefaz: {
        cStat: resposta?.cStat,
        xMotivo: resposta?.xMotivo,
        nProt: resposta?.nProt,
        dhRecbto: resposta?.dhRecbto,
      },
      xml: {
        evento: xmlCancelamento,
        assinado: xmlAssinado,
        resposta: resultado.xml,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── Helpers ──────────────────────────────────────────────

/**
 * Extrai certificado PEM do corpo da requisição ou do ambiente.
 * Prioriza certPem/keyPem enviados no body (modo proxy).
 */
function extractCertFromRequest(req) {
  // Modo proxy: certificado enviado no body
  if (req.body.certPem && req.body.keyPem) {
    return {
      certPem: req.body.certPem,
      keyPem: req.body.keyPem,
    };
  }

  // Modo standalone: certificado do ambiente
  const cert = loadCertificate();
  if (!cert) {
    throw createError(400, "Certificado digital não configurado. Envie certPem/keyPem no body ou configure CERT_PFX_BASE64.");
  }

  // Nota: quando usando PFX via env, certPem e keyPem não ficam disponíveis
  // O https.Agent é criado diretamente com o PFX
  return { certPem: null, keyPem: null };
}

function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = {
  emitir,
  status,
  consultar,
  cancelar,
};
