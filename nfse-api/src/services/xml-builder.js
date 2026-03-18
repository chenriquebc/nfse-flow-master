const { create } = require("xmlbuilder2");
const { v4: uuidv4 } = require("uuid");
const { VERSAO_LAYOUT, NAMESPACES } = require("../config/sefaz");

/**
 * Gera a chave de acesso da NF-e (44 dígitos).
 */
function gerarChaveAcesso({ cUF, AAMM, CNPJ, mod, serie, nNF, tpEmis, cNF }) {
  const chave = `${cUF}${AAMM}${CNPJ}${mod}${String(serie).padStart(3, "0")}${String(nNF).padStart(9, "0")}${tpEmis}${String(cNF).padStart(8, "0")}`;
  const dv = calcularDigitoVerificador(chave);
  return chave + dv;
}

/**
 * Calcula o dígito verificador (módulo 11) da chave de acesso.
 */
function calcularDigitoVerificador(chave) {
  const pesos = [2, 3, 4, 5, 6, 7, 8, 9];
  let soma = 0;
  let idx = 0;

  for (let i = chave.length - 1; i >= 0; i--) {
    soma += parseInt(chave[i]) * pesos[idx % pesos.length];
    idx++;
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/**
 * Gera o XML da NF-e no padrão 4.00.
 *
 * @param {Object} dados - Dados da NF-e
 * @returns {{ xml: string, chaveAcesso: string }}
 */
function gerarXmlNFe(dados) {
  const {
    // Identificação
    cUF,
    natOp,
    serie = 1,
    nNF,
    dhEmi,
    tpNF = 1, // 0=Entrada, 1=Saída
    idDest = 1, // 1=Interna, 2=Interestadual, 3=Exterior
    cMunFG,
    tpImp = 1, // 1=DANFE retrato
    tpEmis = 1, // 1=Normal
    tpAmb = 2, // 1=Produção, 2=Homologação
    finNFe = 1, // 1=Normal
    indFinal = 1, // 1=Consumidor final
    indPres = 1, // 1=Presencial
    procEmi = 0, // 0=Aplicativo do contribuinte
    verProc = "NFSE-FLOW-1.0",

    // Emitente
    emitente,

    // Destinatário
    destinatario,

    // Produtos/Serviços
    itens,

    // Totais (calculados automaticamente se não fornecidos)
    totais,

    // Transporte
    transporte,

    // Cobrança
    cobranca,

    // Pagamento
    pagamento,

    // Informações adicionais
    infAdic,
  } = dados;

  // Gerar código numérico aleatório
  const cNF = String(Math.floor(Math.random() * 99999999)).padStart(8, "0");
  const AAMM = dhEmi.slice(2, 4) + dhEmi.slice(5, 7);
  const mod = "55"; // NF-e

  const chaveAcesso = gerarChaveAcesso({
    cUF: String(cUF).padStart(2, "0"),
    AAMM,
    CNPJ: emitente.CNPJ.replace(/\D/g, "").padStart(14, "0"),
    mod,
    serie,
    nNF,
    tpEmis,
    cNF,
  });

  const doc = create({ version: "1.0", encoding: "UTF-8" });

  const nfe = doc.ele(NAMESPACES.nfe, "NFe");
  const infNFe = nfe.ele("infNFe", { versao: VERSAO_LAYOUT, Id: `NFe${chaveAcesso}` });

  // ─── ide (Identificação da NF-e) ─────────────────
  const ide = infNFe.ele("ide");
  ide.ele("cUF").txt(String(cUF));
  ide.ele("cNF").txt(cNF);
  ide.ele("natOp").txt(natOp);
  ide.ele("mod").txt(mod);
  ide.ele("serie").txt(String(serie));
  ide.ele("nNF").txt(String(nNF));
  ide.ele("dhEmi").txt(dhEmi);
  ide.ele("tpNF").txt(String(tpNF));
  ide.ele("idDest").txt(String(idDest));
  ide.ele("cMunFG").txt(String(cMunFG));
  ide.ele("tpImp").txt(String(tpImp));
  ide.ele("tpEmis").txt(String(tpEmis));
  ide.ele("cDV").txt(String(chaveAcesso.slice(-1)));
  ide.ele("tpAmb").txt(String(tpAmb));
  ide.ele("finNFe").txt(String(finNFe));
  ide.ele("indFinal").txt(String(indFinal));
  ide.ele("indPres").txt(String(indPres));
  ide.ele("procEmi").txt(String(procEmi));
  ide.ele("verProc").txt(verProc);

  // ─── emit (Emitente) ─────────────────────────────
  const emit = infNFe.ele("emit");
  emit.ele("CNPJ").txt(emitente.CNPJ.replace(/\D/g, ""));
  emit.ele("xNome").txt(emitente.xNome);
  if (emitente.xFant) emit.ele("xFant").txt(emitente.xFant);

  const enderEmit = emit.ele("enderEmit");
  enderEmit.ele("xLgr").txt(emitente.endereco.xLgr);
  enderEmit.ele("nro").txt(emitente.endereco.nro);
  if (emitente.endereco.xCpl) enderEmit.ele("xCpl").txt(emitente.endereco.xCpl);
  enderEmit.ele("xBairro").txt(emitente.endereco.xBairro);
  enderEmit.ele("cMun").txt(emitente.endereco.cMun);
  enderEmit.ele("xMun").txt(emitente.endereco.xMun);
  enderEmit.ele("UF").txt(emitente.endereco.UF);
  enderEmit.ele("CEP").txt(emitente.endereco.CEP.replace(/\D/g, ""));
  enderEmit.ele("cPais").txt("1058");
  enderEmit.ele("xPais").txt("BRASIL");
  if (emitente.endereco.fone) enderEmit.ele("fone").txt(emitente.endereco.fone.replace(/\D/g, ""));

  emit.ele("IE").txt(emitente.IE.replace(/\D/g, ""));
  emit.ele("CRT").txt(String(emitente.CRT)); // 1=Simples, 2=Excesso, 3=Normal

  // ─── dest (Destinatário) ──────────────────────────
  const dest = infNFe.ele("dest");
  const docDest = destinatario.documento.replace(/\D/g, "");
  if (docDest.length === 11) {
    dest.ele("CPF").txt(docDest);
  } else {
    dest.ele("CNPJ").txt(docDest);
  }
  dest.ele("xNome").txt(destinatario.xNome);

  if (destinatario.endereco) {
    const enderDest = dest.ele("enderDest");
    enderDest.ele("xLgr").txt(destinatario.endereco.xLgr);
    enderDest.ele("nro").txt(destinatario.endereco.nro);
    if (destinatario.endereco.xCpl) enderDest.ele("xCpl").txt(destinatario.endereco.xCpl);
    enderDest.ele("xBairro").txt(destinatario.endereco.xBairro);
    enderDest.ele("cMun").txt(destinatario.endereco.cMun);
    enderDest.ele("xMun").txt(destinatario.endereco.xMun);
    enderDest.ele("UF").txt(destinatario.endereco.UF);
    enderDest.ele("CEP").txt(destinatario.endereco.CEP.replace(/\D/g, ""));
    enderDest.ele("cPais").txt("1058");
    enderDest.ele("xPais").txt("BRASIL");
    if (destinatario.endereco.fone) enderDest.ele("fone").txt(destinatario.endereco.fone.replace(/\D/g, ""));
  }

  dest.ele("indIEDest").txt(String(destinatario.indIEDest || 9));
  if (destinatario.IE) dest.ele("IE").txt(destinatario.IE.replace(/\D/g, ""));
  if (destinatario.email) dest.ele("email").txt(destinatario.email);

  // ─── det (Produtos/Serviços) ──────────────────────
  let vProdTotal = 0;
  let vICMSTotal = 0;
  let vIPITotal = 0;
  let vPISTotal = 0;
  let vCOFINSTotal = 0;
  let vDescTotal = 0;

  itens.forEach((item, idx) => {
    const det = infNFe.ele("det", { nItem: idx + 1 });

    const prod = det.ele("prod");
    prod.ele("cProd").txt(item.cProd);
    prod.ele("cEAN").txt(item.cEAN || "SEM GTIN");
    prod.ele("xProd").txt(item.xProd);
    prod.ele("NCM").txt(item.NCM);
    if (item.CEST) prod.ele("CEST").txt(item.CEST);
    prod.ele("CFOP").txt(String(item.CFOP));
    prod.ele("uCom").txt(item.uCom);
    prod.ele("qCom").txt(formatDecimal(item.qCom, 4));
    prod.ele("vUnCom").txt(formatDecimal(item.vUnCom, 10));
    prod.ele("vProd").txt(formatDecimal(item.qCom * item.vUnCom, 2));
    prod.ele("cEANTrib").txt(item.cEANTrib || "SEM GTIN");
    prod.ele("uTrib").txt(item.uTrib || item.uCom);
    prod.ele("qTrib").txt(formatDecimal(item.qTrib || item.qCom, 4));
    prod.ele("vUnTrib").txt(formatDecimal(item.vUnTrib || item.vUnCom, 10));
    if (item.vDesc) {
      prod.ele("vDesc").txt(formatDecimal(item.vDesc, 2));
      vDescTotal += item.vDesc;
    }
    prod.ele("indTot").txt(String(item.indTot ?? 1));

    // Impostos
    const imposto = det.ele("imposto");

    // ICMS
    const icms = imposto.ele("ICMS");
    const icmsGrupo = item.ICMS || {};
    const icmsTag = icms.ele(icmsGrupo.CST ? `ICMS${icmsGrupo.CST}` : "ICMS00");
    icmsTag.ele("orig").txt(String(icmsGrupo.orig || 0));
    icmsTag.ele("CST").txt(icmsGrupo.CST || "00");
    icmsTag.ele("modBC").txt(String(icmsGrupo.modBC || 3));
    icmsTag.ele("vBC").txt(formatDecimal(icmsGrupo.vBC || item.qCom * item.vUnCom, 2));
    icmsTag.ele("pICMS").txt(formatDecimal(icmsGrupo.pICMS || 0, 4));
    icmsTag.ele("vICMS").txt(formatDecimal(icmsGrupo.vICMS || 0, 2));
    vICMSTotal += icmsGrupo.vICMS || 0;

    // PIS
    const pis = imposto.ele("PIS");
    const pisGrupo = item.PIS || {};
    const pisTag = pis.ele(pisGrupo.CST === "01" ? "PISAliq" : "PISNT");
    pisTag.ele("CST").txt(pisGrupo.CST || "07");
    if (pisGrupo.CST === "01") {
      pisTag.ele("vBC").txt(formatDecimal(pisGrupo.vBC || 0, 2));
      pisTag.ele("pPIS").txt(formatDecimal(pisGrupo.pPIS || 0, 4));
      pisTag.ele("vPIS").txt(formatDecimal(pisGrupo.vPIS || 0, 2));
      vPISTotal += pisGrupo.vPIS || 0;
    }

    // COFINS
    const cofins = imposto.ele("COFINS");
    const cofinsGrupo = item.COFINS || {};
    const cofinsTag = cofins.ele(cofinsGrupo.CST === "01" ? "COFINSAliq" : "COFINSNT");
    cofinsTag.ele("CST").txt(cofinsGrupo.CST || "07");
    if (cofinsGrupo.CST === "01") {
      cofinsTag.ele("vBC").txt(formatDecimal(cofinsGrupo.vBC || 0, 2));
      cofinsTag.ele("pCOFINS").txt(formatDecimal(cofinsGrupo.pCOFINS || 0, 4));
      cofinsTag.ele("vCOFINS").txt(formatDecimal(cofinsGrupo.vCOFINS || 0, 2));
      vCOFINSTotal += cofinsGrupo.vCOFINS || 0;
    }

    vProdTotal += item.qCom * item.vUnCom;
  });

  // ─── total ────────────────────────────────────────
  const total = infNFe.ele("total");
  const icmsTot = total.ele("ICMSTot");
  icmsTot.ele("vBC").txt(formatDecimal(totais?.vBC || vProdTotal, 2));
  icmsTot.ele("vICMS").txt(formatDecimal(totais?.vICMS || vICMSTotal, 2));
  icmsTot.ele("vICMSDeson").txt(formatDecimal(totais?.vICMSDeson || 0, 2));
  icmsTot.ele("vFCPUFDest").txt(formatDecimal(0, 2));
  icmsTot.ele("vICMSUFDest").txt(formatDecimal(0, 2));
  icmsTot.ele("vICMSUFRemet").txt(formatDecimal(0, 2));
  icmsTot.ele("vFCP").txt(formatDecimal(0, 2));
  icmsTot.ele("vBCST").txt(formatDecimal(0, 2));
  icmsTot.ele("vST").txt(formatDecimal(0, 2));
  icmsTot.ele("vFCPST").txt(formatDecimal(0, 2));
  icmsTot.ele("vFCPSTRet").txt(formatDecimal(0, 2));
  icmsTot.ele("vProd").txt(formatDecimal(vProdTotal, 2));
  icmsTot.ele("vFrete").txt(formatDecimal(totais?.vFrete || 0, 2));
  icmsTot.ele("vSeg").txt(formatDecimal(totais?.vSeg || 0, 2));
  icmsTot.ele("vDesc").txt(formatDecimal(vDescTotal, 2));
  icmsTot.ele("vII").txt(formatDecimal(0, 2));
  icmsTot.ele("vIPI").txt(formatDecimal(vIPITotal, 2));
  icmsTot.ele("vIPIDevol").txt(formatDecimal(0, 2));
  icmsTot.ele("vPIS").txt(formatDecimal(vPISTotal, 2));
  icmsTot.ele("vCOFINS").txt(formatDecimal(vCOFINSTotal, 2));
  icmsTot.ele("vOutro").txt(formatDecimal(totais?.vOutro || 0, 2));
  icmsTot.ele("vNF").txt(formatDecimal(totais?.vNF || (vProdTotal - vDescTotal), 2));

  // ─── transp (Transporte) ──────────────────────────
  const transp = infNFe.ele("transp");
  transp.ele("modFrete").txt(String(transporte?.modFrete ?? 9)); // 9=Sem frete

  if (transporte?.transporta) {
    const transporta = transp.ele("transporta");
    if (transporte.transporta.CNPJ) transporta.ele("CNPJ").txt(transporte.transporta.CNPJ.replace(/\D/g, ""));
    if (transporte.transporta.xNome) transporta.ele("xNome").txt(transporte.transporta.xNome);
    if (transporte.transporta.IE) transporta.ele("IE").txt(transporte.transporta.IE);
    if (transporte.transporta.xEnder) transporta.ele("xEnder").txt(transporte.transporta.xEnder);
    if (transporte.transporta.xMun) transporta.ele("xMun").txt(transporte.transporta.xMun);
    if (transporte.transporta.UF) transporta.ele("UF").txt(transporte.transporta.UF);
  }

  if (transporte?.vol) {
    transporte.vol.forEach((v) => {
      const vol = transp.ele("vol");
      if (v.qVol) vol.ele("qVol").txt(String(v.qVol));
      if (v.esp) vol.ele("esp").txt(v.esp);
      if (v.marca) vol.ele("marca").txt(v.marca);
      if (v.nVol) vol.ele("nVol").txt(v.nVol);
      if (v.pesoL) vol.ele("pesoL").txt(formatDecimal(v.pesoL, 3));
      if (v.pesoB) vol.ele("pesoB").txt(formatDecimal(v.pesoB, 3));
    });
  }

  // ─── cobr (Cobrança) ──────────────────────────────
  if (cobranca) {
    const cobr = infNFe.ele("cobr");
    if (cobranca.fat) {
      const fat = cobr.ele("fat");
      fat.ele("nFat").txt(cobranca.fat.nFat);
      fat.ele("vOrig").txt(formatDecimal(cobranca.fat.vOrig, 2));
      fat.ele("vDesc").txt(formatDecimal(cobranca.fat.vDesc || 0, 2));
      fat.ele("vLiq").txt(formatDecimal(cobranca.fat.vLiq, 2));
    }
    if (cobranca.dup) {
      cobranca.dup.forEach((d) => {
        const dup = cobr.ele("dup");
        dup.ele("nDup").txt(d.nDup);
        dup.ele("dVenc").txt(d.dVenc);
        dup.ele("vDup").txt(formatDecimal(d.vDup, 2));
      });
    }
  }

  // ─── pag (Pagamento) ──────────────────────────────
  const pag = infNFe.ele("pag");
  const detPag = pag.ele("detPag");
  detPag.ele("tPag").txt(pagamento?.tPag || "01"); // 01=Dinheiro
  detPag.ele("vPag").txt(formatDecimal(pagamento?.vPag || (vProdTotal - vDescTotal), 2));

  // ─── infAdic (Informações Adicionais) ─────────────
  if (infAdic) {
    const infAdicEl = infNFe.ele("infAdic");
    if (infAdic.infCpl) infAdicEl.ele("infCpl").txt(infAdic.infCpl);
    if (infAdic.infAdFisco) infAdicEl.ele("infAdFisco").txt(infAdic.infAdFisco);
  }

  const xml = doc.end({ prettyPrint: false });

  return { xml, chaveAcesso };
}

/**
 * Gera o SOAP envelope para consulta de status do serviço.
 */
function gerarXmlStatusServico(cUF, tpAmb) {
  const doc = create({ version: "1.0", encoding: "UTF-8" });

  const envelope = doc.ele(NAMESPACES.soap, "soap12:Envelope");
  envelope.att("xmlns:soap12", NAMESPACES.soap);

  const body = envelope.ele("soap12:Body");
  const nfeDadosMsg = body.ele(NAMESPACES.nfe, "nfeDadosMsg");

  const consStatServ = nfeDadosMsg.ele(NAMESPACES.nfe, "consStatServ", { versao: VERSAO_LAYOUT });
  consStatServ.ele("tpAmb").txt(String(tpAmb));
  consStatServ.ele("cUF").txt(String(cUF));
  consStatServ.ele("xServ").txt("STATUS");

  return doc.end({ prettyPrint: false });
}

/**
 * Gera o SOAP envelope para envio de lote.
 */
function gerarXmlEnvioLote(xmlNFeAssinado, idLote) {
  const doc = create({ version: "1.0", encoding: "UTF-8" });

  const envelope = doc.ele(NAMESPACES.soap, "soap12:Envelope");
  envelope.att("xmlns:soap12", NAMESPACES.soap);

  const body = envelope.ele("soap12:Body");
  const nfeDadosMsg = body.ele(NAMESPACES.nfe, "nfeDadosMsg");

  const enviNFe = nfeDadosMsg.ele(NAMESPACES.nfe, "enviNFe", { versao: VERSAO_LAYOUT });
  enviNFe.ele("idLote").txt(idLote);
  enviNFe.ele("indSinc").txt("1"); // Síncrono

  // Inserir o XML da NF-e assinada dentro do lote
  // O xmlNFeAssinado já contém a tag <NFe>
  enviNFe.import(create(xmlNFeAssinado).root());

  return doc.end({ prettyPrint: false });
}

/**
 * Gera o SOAP envelope para consulta de recibo.
 */
function gerarXmlConsultaRecibo(nRec, tpAmb) {
  const doc = create({ version: "1.0", encoding: "UTF-8" });

  const envelope = doc.ele(NAMESPACES.soap, "soap12:Envelope");
  envelope.att("xmlns:soap12", NAMESPACES.soap);

  const body = envelope.ele("soap12:Body");
  const nfeDadosMsg = body.ele(NAMESPACES.nfe, "nfeDadosMsg");

  const consReciNFe = nfeDadosMsg.ele(NAMESPACES.nfe, "consReciNFe", { versao: VERSAO_LAYOUT });
  consReciNFe.ele("tpAmb").txt(String(tpAmb));
  consReciNFe.ele("nRec").txt(nRec);

  return doc.end({ prettyPrint: false });
}

/**
 * Gera o SOAP envelope para consulta de NF-e por chave.
 */
function gerarXmlConsultaChave(chNFe, tpAmb) {
  const doc = create({ version: "1.0", encoding: "UTF-8" });

  const envelope = doc.ele(NAMESPACES.soap, "soap12:Envelope");
  envelope.att("xmlns:soap12", NAMESPACES.soap);

  const body = envelope.ele("soap12:Body");
  const nfeDadosMsg = body.ele(NAMESPACES.nfe, "nfeDadosMsg");

  const consSitNFe = nfeDadosMsg.ele(NAMESPACES.nfe, "consSitNFe", { versao: VERSAO_LAYOUT });
  consSitNFe.ele("tpAmb").txt(String(tpAmb));
  consSitNFe.ele("xServ").txt("CONSULTAR");
  consSitNFe.ele("chNFe").txt(chNFe);

  return doc.end({ prettyPrint: false });
}

/**
 * Gera o XML do evento de cancelamento.
 */
function gerarXmlCancelamento({ chNFe, nProt, xJust, CNPJ, tpAmb, cOrgao }) {
  const doc = create({ version: "1.0", encoding: "UTF-8" });

  const envelope = doc.ele(NAMESPACES.soap, "soap12:Envelope");
  envelope.att("xmlns:soap12", NAMESPACES.soap);

  const body = envelope.ele("soap12:Body");
  const nfeDadosMsg = body.ele(NAMESPACES.nfe, "nfeDadosMsg");

  const envEvento = nfeDadosMsg.ele(NAMESPACES.nfe, "envEvento", { versao: VERSAO_LAYOUT });
  envEvento.ele("idLote").txt(String(Date.now()).slice(-15));

  const evento = envEvento.ele("evento", { versao: VERSAO_LAYOUT });
  const infEvento = evento.ele("infEvento", { Id: `ID110111${chNFe}01` });

  infEvento.ele("cOrgao").txt(String(cOrgao));
  infEvento.ele("tpAmb").txt(String(tpAmb));
  infEvento.ele("CNPJ").txt(CNPJ.replace(/\D/g, ""));
  infEvento.ele("chNFe").txt(chNFe);
  infEvento.ele("dhEvento").txt(new Date().toISOString());
  infEvento.ele("tpEvento").txt("110111");
  infEvento.ele("nSeqEvento").txt("1");
  infEvento.ele("verEvento").txt("1.00");

  const detEvento = infEvento.ele("detEvento", { versao: "1.00" });
  detEvento.ele("descEvento").txt("Cancelamento");
  detEvento.ele("nProt").txt(nProt);
  detEvento.ele("xJust").txt(xJust);

  return doc.end({ prettyPrint: false });
}

function formatDecimal(value, decimals) {
  return Number(value || 0).toFixed(decimals);
}

module.exports = {
  gerarXmlNFe,
  gerarXmlStatusServico,
  gerarXmlEnvioLote,
  gerarXmlConsultaRecibo,
  gerarXmlConsultaChave,
  gerarXmlCancelamento,
  gerarChaveAcesso,
};
