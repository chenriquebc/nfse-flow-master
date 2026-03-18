const https = require("https");
const crypto = require("crypto");

/**
 * POST /proxy
 *
 * Endpoint de compatibilidade com o proxy mTLS anterior.
 * Recebe { method, hostname, path, body, certPem, keyPem, contentType }
 * e faz a requisição mTLS direta.
 */
async function proxyHandler(req, res, next) {
  try {
    // Auth check
    const token = process.env.MTLS_PROXY_TOKEN;
    const authHeader = req.headers["authorization"];
    if (!authHeader || authHeader !== `Bearer ${token}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { method, hostname, path, body, certPem, keyPem, contentType } = req.body;

    if (!hostname || !path || !certPem || !keyPem) {
      return res.status(400).json({
        error: "Missing required fields: hostname, path, certPem, keyPem",
      });
    }

    console.log(`[proxy] ${method || "GET"} https://${hostname}${path}`);

    const result = await makeRequest({
      method: method || "GET",
      hostname,
      path,
      body: body || null,
      certPem,
      keyPem,
      contentType: contentType || "application/xml",
    });

    console.log(`[proxy] Response: ${result.status} (${result.body.length} bytes)`);

    res.json({
      status: result.status,
      body: result.body,
    });
  } catch (err) {
    console.error(`[proxy] Error:`, err.message);
    res.status(502).json({
      error: err.message,
      code: err.code || "UNKNOWN",
    });
  }
}

function makeRequest({ method, hostname, path, body, certPem, keyPem, contentType }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname,
      port: 443,
      path,
      method,
      cert: certPem,
      key: keyPem,
      headers: {
        Accept: "application/xml",
      },
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
      secureOptions: crypto.constants.SSL_OP_LEGACY_SERVER_CONNECT,
    };

    if (body && contentType) {
      options.headers["Content-Type"] = contentType;
      options.headers["Content-Length"] = Buffer.byteLength(body, "utf8");
    }

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
    });

    req.on("error", (err) => reject(err));
    req.setTimeout(30000, () => {
      req.destroy(new Error("Request timeout (30s)"));
    });

    if (body) req.write(body, "utf8");
    req.end();
  });
}

module.exports = proxyHandler;
