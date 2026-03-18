const https = require("https");
const http = require("http");
const tls = require("tls");

const PORT = process.env.PORT || 8080;
const PROXY_TOKEN = process.env.PROXY_TOKEN;

if (!PROXY_TOKEN) {
  console.error("PROXY_TOKEN environment variable is required");
  process.exit(1);
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
        "Accept": "application/xml",
      },
      // Force TLS 1.2 for SEFIN compatibility
      secureProtocol: "TLSv1_2_method",
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
      // Allow renegotiation (required by some gov servers)
      secureOptions: require("constants").SSL_OP_LEGACY_SERVER_CONNECT,
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

const server = http.createServer(async (req, res) => {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    return res.end();
  }

  // Health check
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ status: "ok" }));
  }

  // Only POST /proxy
  if (req.url !== "/proxy" || req.method !== "POST") {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Not found" }));
  }

  // Auth check
  const authHeader = req.headers["authorization"];
  if (!authHeader || authHeader !== `Bearer ${PROXY_TOKEN}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Unauthorized" }));
  }

  // Read body
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid JSON" }));
  }

  const { method, hostname, path, body, certPem, keyPem, contentType } = payload;

  if (!hostname || !path || !certPem || !keyPem) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing required fields: hostname, path, certPem, keyPem" }));
  }

  try {
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

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: result.status,
      body: result.body,
    }));
  } catch (err) {
    console.error(`[proxy] Error:`, err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      error: err.message,
      code: err.code || "UNKNOWN",
    }));
  }
});

server.listen(PORT, () => {
  console.log(`mTLS proxy listening on port ${PORT}`);
});
