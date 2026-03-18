# mTLS Proxy para NFS-e

Micro-serviço Node.js que faz proxy de requisições mTLS para o portal nacional da NFS-e (SEFIN).

## Deploy no Fly.io (gratuito)

```bash
# 1. Instalar Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Criar o app (na pasta mtls-proxy/)
cd mtls-proxy
fly launch --no-deploy

# 4. Definir o token de autenticação
fly secrets set PROXY_TOKEN="<gere-um-token-seguro-aqui>"

# 5. Deploy
fly deploy

# 6. Testar
curl https://nfse-mtls-proxy.fly.dev/health
```

## Como funciona

O proxy recebe requisições POST em `/proxy` com:

```json
{
  "method": "POST",
  "hostname": "sefin.nfse.gov.br",
  "path": "/SefinNacional/nfse",
  "body": "<xml>...</xml>",
  "certPem": "-----BEGIN CERTIFICATE-----...",
  "keyPem": "-----BEGIN PRIVATE KEY-----...",
  "contentType": "application/xml"
}
```

E retorna:

```json
{
  "status": 200,
  "body": "<xml-response>...</xml-response>"
}
```

## Segurança

- Autenticação via Bearer token (`PROXY_TOKEN`)
- Comunicação HTTPS em ambas as pontas
- Certificados não são armazenados no proxy
- Auto-stop quando inativo (Fly.io)

## Custo estimado

- **Fly.io free tier**: 3 VMs compartilhadas, 256MB RAM cada
- Ideal para baixo volume de emissão (< 1000 notas/mês)
