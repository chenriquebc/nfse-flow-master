# API NF-e - Emissão de Nota Fiscal Eletrônica

API Node.js/Express completa para emissão de NF-e (modelo 55) com integração direta com a SEFAZ via mTLS.

## 🏗️ Arquitetura

```
nfse-api/
├── src/
│   ├── index.js              # Servidor Express
│   ├── config/
│   │   └── sefaz.js           # URLs dos webservices por UF
│   ├── middleware/
│   │   └── auth.js            # Autenticação Bearer token
│   ├── services/
│   │   ├── certificate.js     # Carregamento e mTLS com certificado A1
│   │   ├── xml-builder.js     # Geração de XML NF-e 4.00
│   │   ├── xml-signer.js      # Assinatura digital ICP-Brasil
│   │   └── sefaz.js           # Comunicação SOAP com SEFAZ
│   ├── controllers/
│   │   ├── nfe.js             # Controladores REST
│   │   └── proxy.js           # Proxy mTLS genérico (compatibilidade)
│   └── routes/
│       └── nfe.js             # Definição de rotas
├── Dockerfile
├── docker-compose.yml
├── package.json
└── .env.example
```

## 🚀 Deploy

### Docker (recomendado)

```bash
cd nfse-api

# Criar .env a partir do exemplo
cp .env.example .env
# Editar .env com suas credenciais

# Subir com Docker Compose
docker-compose up -d
```

### VPS / Servidor próprio

```bash
cd nfse-api
npm install
cp .env.example .env
# Editar .env
npm start
```

### Railway / Render

1. Faça push do diretório `nfse-api/` para um repositório Git
2. Conecte ao Railway/Render
3. Configure as variáveis de ambiente
4. Deploy automático

## 📋 Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|---|---|---|
| `MTLS_PROXY_TOKEN` | Token de autenticação da API | ✅ |
| `CERT_PFX_BASE64` | Certificado A1 (.pfx) em Base64 | ⚠️ * |
| `CERT_PASSWORD` | Senha do certificado | ⚠️ * |
| `SEFAZ_AMBIENTE` | 1=Produção, 2=Homologação | ❌ (default: 2) |
| `SEFAZ_UF_CODIGO` | Código IBGE da UF | ❌ (default: 35) |
| `PORT` | Porta do servidor | ❌ (default: 8080) |

\* O certificado pode ser enviado via variável de ambiente OU no body de cada request (modo proxy).

## 🔌 Endpoints

### `POST /nfe/emitir`
Emissão completa: gera XML → assina → envia para SEFAZ.

```json
{
  "certPem": "-----BEGIN CERTIFICATE-----...",
  "keyPem": "-----BEGIN PRIVATE KEY-----...",
  "cUF": 35,
  "natOp": "VENDA DE MERCADORIA",
  "serie": 1,
  "nNF": 1,
  "dhEmi": "2024-01-15T10:00:00-03:00",
  "cMunFG": "3550308",
  "emitente": { ... },
  "destinatario": { ... },
  "itens": [ ... ],
  "pagamento": { "tPag": "01", "vPag": 100.00 }
}
```

### `POST /nfe/status`
Consulta status do serviço SEFAZ.

### `GET /nfe/:chave`
Consulta NF-e por chave de acesso (44 dígitos).

### `POST /nfe/cancelar`
Cancela uma NF-e autorizada.

```json
{
  "chNFe": "35240112345678000195550010000000011234567890",
  "nProt": "135240000000001",
  "xJust": "Cancelamento por erro nos dados do destinatário",
  "CNPJ": "12345678000195"
}
```

### `POST /proxy`
Endpoint de compatibilidade com proxy mTLS genérico (usado pelas Edge Functions).

## 🔐 Autenticação

Todas as requisições devem incluir:

```
Authorization: Bearer <MTLS_PROXY_TOKEN>
```

## 🗺️ UFs Suportadas

SP, MG, RJ, RS, PR, BA, GO, PE, MT, MS e todas UFs que usam SVRS.

## 📝 Notas

- Comunicação com SEFAZ via SOAP sobre HTTPS com mTLS (TLS 1.2)
- Assinatura digital no padrão ICP-Brasil (RSA-SHA1)
- XML no layout NF-e 4.00
- Suporta envio síncrono (indSinc=1)
