/**
 * Configuração dos webservices SEFAZ por UF e ambiente.
 *
 * Fonte oficial: http://www.nfe.fazenda.gov.br/portal/webServices.aspx
 *
 * Ambiente: 1 = Produção, 2 = Homologação
 */

const NAMESPACES = {
  nfe: "http://www.portalfiscal.inf.br/nfe",
  soap: "http://www.w3.org/2003/05/soap-envelope",
  wsdl: "http://www.portalfiscal.inf.br/nfe/wsdl",
};

// Versão do layout NF-e
const VERSAO_LAYOUT = "4.00";

// ─── URLs dos Webservices por UF ────────────────────────────────────

const WEBSERVICES = {
  // ─── São Paulo (SP) ───────────────────────────────
  35: {
    1: {
      NFeAutorizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
      NFeStatusServico: "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
      NFeConsultaProtocolo: "https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
      RecepcaoEvento: "https://nfe.fazenda.sp.gov.br/ws/recepcaoevento4.asmx",
    },
    2: {
      NFeAutorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      NFeRetAutorizacao: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
      NFeStatusServico: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
      NFeConsultaProtocolo: "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx",
      RecepcaoEvento: "https://homologacao.nfe.fazenda.sp.gov.br/ws/recepcaoevento4.asmx",
    },
  },

  // ─── Minas Gerais (MG) ────────────────────────────
  31: {
    1: {
      NFeAutorizacao: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      NFeRetAutorizacao: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
      NFeStatusServico: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
      NFeConsultaProtocolo: "https://nfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
      RecepcaoEvento: "https://nfe.fazenda.mg.gov.br/nfe2/services/RecepcaoEvento4",
    },
    2: {
      NFeAutorizacao: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeAutorizacao4",
      NFeRetAutorizacao: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeRetAutorizacao4",
      NFeStatusServico: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeStatusServico4",
      NFeConsultaProtocolo: "https://hnfe.fazenda.mg.gov.br/nfe2/services/NFeConsultaProtocolo4",
      RecepcaoEvento: "https://hnfe.fazenda.mg.gov.br/nfe2/services/RecepcaoEvento4",
    },
  },

  // ─── Rio de Janeiro (RJ) – SVRS ──────────────────
  33: {
    1: {
      NFeAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://nfe.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
    2: {
      NFeAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
  },

  // ─── Rio Grande do Sul (RS) ───────────────────────
  43: {
    1: {
      NFeAutorizacao: "https://nfe.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://nfe.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://nfe.sefazrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://nfe.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
    2: {
      NFeAutorizacao: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://nfe-homologacao.sefazrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
  },

  // ─── Paraná (PR) ──────────────────────────────────
  41: {
    1: {
      NFeAutorizacao: "https://nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://nfe.sefa.pr.gov.br/nfe/NFeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4?wsdl",
    },
    2: {
      NFeAutorizacao: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://homologacao.nfe.sefa.pr.gov.br/nfe/NFeRecepcaoEvento4?wsdl",
    },
  },

  // ─── Bahia (BA) ───────────────────────────────────
  29: {
    1: {
      NFeAutorizacao: "https://nfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://nfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://nfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://nfe.sefaz.ba.gov.br/webservices/RecepcaoEvento4/RecepcaoEvento4.asmx",
    },
    2: {
      NFeAutorizacao: "https://hnfe.sefaz.ba.gov.br/webservices/NFeAutorizacao4/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://hnfe.sefaz.ba.gov.br/webservices/NFeRetAutorizacao4/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://hnfe.sefaz.ba.gov.br/webservices/NFeStatusServico4/NFeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://hnfe.sefaz.ba.gov.br/webservices/NFeConsultaProtocolo4/NFeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://hnfe.sefaz.ba.gov.br/webservices/RecepcaoEvento4/RecepcaoEvento4.asmx",
    },
  },

  // ─── Goiás (GO) ───────────────────────────────────
  52: {
    1: {
      NFeAutorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfe.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://nfe.sefaz.go.gov.br/nfe/services/NFeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://nfe.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://nfe.sefaz.go.gov.br/nfe/services/RecepcaoEvento4?wsdl",
    },
    2: {
      NFeAutorizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://homolog.sefaz.go.gov.br/nfe/services/NFeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://homolog.sefaz.go.gov.br/nfe/services/NFeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://homolog.sefaz.go.gov.br/nfe/services/RecepcaoEvento4?wsdl",
    },
  },

  // ─── Pernambuco (PE) ──────────────────────────────
  26: {
    1: {
      NFeAutorizacao: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://nfe.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://nfe.sefaz.pe.gov.br/nfe-service/services/RecepcaoEvento4?wsdl",
    },
    2: {
      NFeAutorizacao: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/NFeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://nfehomolog.sefaz.pe.gov.br/nfe-service/services/RecepcaoEvento4?wsdl",
    },
  },

  // ─── Mato Grosso (MT) ─────────────────────────────
  51: {
    1: {
      NFeAutorizacao: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/NfeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://nfe.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4?wsdl",
    },
    2: {
      NFeAutorizacao: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeAutorizacao4?wsdl",
      NFeRetAutorizacao: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeRetAutorizacao4?wsdl",
      NFeStatusServico: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeStatusServico4?wsdl",
      NFeConsultaProtocolo: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/NfeConsultaProtocolo4?wsdl",
      RecepcaoEvento: "https://homologacao.sefaz.mt.gov.br/nfews/v2/services/RecepcaoEvento4?wsdl",
    },
  },

  // ─── Mato Grosso do Sul (MS) – SVRS ──────────────
  50: {
    1: {
      NFeAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://nfe.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
    2: {
      NFeAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      NFeRetAutorizacao: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
      NFeStatusServico: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
      NFeConsultaProtocolo: "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeConsultaProtocolo/NfeConsultaProtocolo4.asmx",
      RecepcaoEvento: "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    },
  },
};

// UFs que usam SVRS (Sefaz Virtual Rio Grande do Sul)
const UFS_SVRS = [12, 14, 16, 27, 28, 33, 50, 13, 15, 17, 21, 22, 24, 25, 32, 42, 53];

/**
 * Retorna as URLs dos webservices para uma UF e ambiente.
 * Se a UF não tiver configuração específica, usa SVRS.
 */
function getWebserviceUrls(ufCodigo, ambiente) {
  const uf = parseInt(ufCodigo);
  const amb = parseInt(ambiente);

  if (WEBSERVICES[uf] && WEBSERVICES[uf][amb]) {
    return WEBSERVICES[uf][amb];
  }

  // Fallback para SVRS
  if (UFS_SVRS.includes(uf)) {
    return WEBSERVICES[33][amb]; // RJ usa SVRS, mesmos endpoints
  }

  throw new Error(`Webservices não configurados para UF ${uf} ambiente ${amb}`);
}

module.exports = {
  NAMESPACES,
  VERSAO_LAYOUT,
  WEBSERVICES,
  UFS_SVRS,
  getWebserviceUrls,
};
