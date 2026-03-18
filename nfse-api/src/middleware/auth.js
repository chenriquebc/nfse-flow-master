/**
 * Middleware de autenticação via Bearer token.
 */
function authMiddleware(req, res, next) {
  const token = process.env.MTLS_PROXY_TOKEN;

  if (!token) {
    console.error("MTLS_PROXY_TOKEN não configurado");
    return res.status(500).json({ error: "Servidor não configurado corretamente" });
  }

  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token de autenticação ausente" });
  }

  const provided = authHeader.slice(7);
  if (provided !== token) {
    return res.status(403).json({ error: "Token inválido" });
  }

  next();
}

module.exports = authMiddleware;
