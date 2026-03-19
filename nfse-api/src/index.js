require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const nfeRoutes = require("./routes/nfe");
const { loadCertificate } = require("./services/certificate");

const app = express();
const PORT = process.env.PORT || 8080;

// ─── Middleware ─────────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("combined"));

// ─── Health check ───────────────────────────────────
app.get("/health", (req, res) => {
  const certLoaded = !!loadCertificate();
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    certificate: certLoaded ? "loaded" : "missing",
    ambiente: process.env.SEFAZ_AMBIENTE === "1" ? "producao" : "homologacao",
  });
});

// ─── Rotas NF-e ─────────────────────────────────────
app.use("/nfe", nfeRoutes);

// ─── Rota legada /proxy (compatibilidade) ───────────
app.post("/proxy", require("./controllers/proxy"));

// ─── Error handler ──────────────────────────────────
app.use((err, req, res, _next) => {
  console.error("[ERROR]", err.message, err.stack);
  res.status(err.status || 500).json({
    error: err.message || "Erro interno do servidor",
    code: err.code || "INTERNAL_ERROR",
  });
});

// ─── 404 ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`🚀 NF-e API rodando na porta ${PORT}`);
  console.log(`   Ambiente: ${process.env.SEFAZ_AMBIENTE === "1" ? "PRODUÇÃO" : "HOMOLOGAÇÃO"}`);
  console.log(`   UF: ${process.env.SEFAZ_UF_CODIGO || "não configurada"}`);

  const cert = loadCertificate();
  if (cert) {
    console.log(`   Certificado padrão: carregado`);
  } else {
    console.log("   Certificado padrão não configurado (modo proxy dinâmico via certPem/keyPem ativo)");
  }
});
