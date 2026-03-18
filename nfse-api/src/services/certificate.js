const https = require("https");
const crypto = require("crypto");

let _cachedAgent = null;
let _cachedCert = null;

/**
 * Carrega o certificado digital A1 (.pfx) de variáveis de ambiente.
 * Retorna { pfx, passphrase } ou null se não configurado.
 */
function loadCertificate() {
  if (_cachedCert) return _cachedCert;

  const pfxBase64 = process.env.CERT_PFX_BASE64;
  const password = process.env.CERT_PASSWORD;

  if (!pfxBase64 || !password) return null;

  try {
    const pfx = Buffer.from(pfxBase64, "base64");
    _cachedCert = { pfx, passphrase: password };
    return _cachedCert;
  } catch (err) {
    console.error("Erro ao decodificar certificado:", err.message);
    return null;
  }
}

/**
 * Carrega certificado a partir de PEM (enviado pelo Edge Function).
 */
function loadCertificateFromPem(certPem, keyPem) {
  return {
    cert: certPem,
    key: keyPem,
  };
}

/**
 * Cria um https.Agent com mTLS usando o certificado A1.
 * Suporta certificado via env (pfx) ou via PEM (dinâmico).
 */
function createMtlsAgent(options = {}) {
  const { certPem, keyPem } = options;

  if (certPem && keyPem) {
    return new https.Agent({
      cert: certPem,
      key: keyPem,
      rejectUnauthorized: true,
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    });
  }

  // Usar certificado do ambiente
  const cert = loadCertificate();
  if (!cert) {
    throw new Error("Certificado digital não configurado");
  }

  if (_cachedAgent) return _cachedAgent;

  _cachedAgent = new https.Agent({
    pfx: cert.pfx,
    passphrase: cert.passphrase,
    rejectUnauthorized: true,
    minVersion: "TLSv1.2",
    maxVersion: "TLSv1.2",
    secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
  });

  return _cachedAgent;
}

/**
 * Extrai cert e key PEM de um PFX buffer.
 */
function extractPemFromPfx(pfxBuffer, password) {
  // Node.js crypto não exporta PEM diretamente de PFX.
  // Usamos o pfx direto no https.Agent.
  return {
    pfx: pfxBuffer,
    passphrase: password,
  };
}

/**
 * Limpa o cache do certificado (útil para recarregar).
 */
function clearCertificateCache() {
  _cachedAgent = null;
  _cachedCert = null;
}

module.exports = {
  loadCertificate,
  loadCertificateFromPem,
  createMtlsAgent,
  extractPemFromPfx,
  clearCertificateCache,
};
