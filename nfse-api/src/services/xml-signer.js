const { SignedXml } = require("xml-crypto");
const crypto = require("crypto");

/**
 * Assina digitalmente um XML de NF-e usando o padrão ICP-Brasil.
 *
 * Padrão de assinatura:
 * - Algoritmo: RSA-SHA1 (exigido pela SEFAZ)
 * - Canonicalização: Exclusive XML Canonicalization
 * - Transform: Enveloped Signature + C14N Exclusive
 * - Referência: URI com Id do infNFe ou infEvento
 *
 * @param {string} xml - XML a ser assinado
 * @param {string} certPem - Certificado PEM (inclui chain)
 * @param {string} keyPem - Chave privada PEM
 * @param {string} referenceUri - URI da referência (ex: "NFe35...")
 * @returns {string} XML assinado
 */
function assinarXml(xml, certPem, keyPem, referenceUri) {
  const sig = new SignedXml({
    privateKey: keyPem,
    canonicalizationAlgorithm: "http://www.w3.org/2001/10/xml-exc-c14n#",
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
  });

  sig.addReference({
    xpath: `//*[@Id='${referenceUri}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/2001/10/xml-exc-c14n#",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });

  // Extrair o certificado X509 (sem headers PEM)
  const x509 = extractX509FromPem(certPem);
  sig.keyInfoProvider = {
    getKeyInfo: () => `<X509Data><X509Certificate>${x509}</X509Certificate></X509Data>`,
  };

  sig.computeSignature(xml, {
    prefix: "",
    location: {
      reference: `//*[@Id='${referenceUri}']`,
      action: "append",
    },
  });

  return sig.getSignedXml();
}

/**
 * Assina o XML da NF-e (tag infNFe).
 */
function assinarNFe(xmlNFe, certPem, keyPem, chaveAcesso) {
  return assinarXml(xmlNFe, certPem, keyPem, `NFe${chaveAcesso}`);
}

/**
 * Assina o XML de evento (tag infEvento).
 */
function assinarEvento(xmlEvento, certPem, keyPem, idEvento) {
  return assinarXml(xmlEvento, certPem, keyPem, idEvento);
}

/**
 * Extrai o conteúdo Base64 do certificado X509 de uma string PEM.
 */
function extractX509FromPem(pem) {
  // Pega apenas o primeiro certificado (end-entity)
  const match = pem.match(
    /-----BEGIN CERTIFICATE-----\s*([\s\S]*?)\s*-----END CERTIFICATE-----/
  );
  if (!match) throw new Error("Certificado X509 não encontrado no PEM");
  return match[1].replace(/\s/g, "");
}

/**
 * Valida se a chave privada corresponde ao certificado.
 */
function validarParCertificadoChave(certPem, keyPem) {
  try {
    const cert = crypto.createPublicKey({
      key: certPem,
      format: "pem",
    });
    const key = crypto.createPrivateKey({
      key: keyPem,
      format: "pem",
    });

    // Testa assinatura e verificação
    const testData = "test";
    const sign = crypto.createSign("SHA256");
    sign.update(testData);
    const signature = sign.sign(key);

    const verify = crypto.createVerify("SHA256");
    verify.update(testData);
    return verify.verify(cert, signature);
  } catch {
    return false;
  }
}

module.exports = {
  assinarXml,
  assinarNFe,
  assinarEvento,
  extractX509FromPem,
  validarParCertificadoChave,
};
