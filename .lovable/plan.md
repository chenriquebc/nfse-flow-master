

## Plano: Base de Tomadores de Serviço + Envio automático de e-mail com XML/PDF

### Visão Geral

Criar um cadastro dedicado de Tomadores de Serviço (separado das notas fiscais), com tela de gerenciamento CRUD e opção de disparo automático de e-mail com XML/PDF ao emitir nota contra o tomador.

---

### 1. Tabela `service_takers` no banco de dados

Nova tabela com os campos:
- `id`, `tenant_id`, `document` (CPF/CNPJ), `name`, `email`, `phone`
- Endereço: `address_street`, `address_number`, `address_complement`, `address_neighborhood`, `address_city`, `address_city_code`, `address_state`, `address_zip`
- `auto_send_email` (boolean, default false) — flag para envio automático de e-mail ao emitir nota
- `created_at`, `updated_at`
- Unique constraint em `(tenant_id, document)`

RLS: acesso restrito por `get_user_tenant_ids()`.

---

### 2. Página de Gerenciamento de Tomadores (`/takers`)

- Nova página `src/pages/Takers.tsx` com listagem, busca, e ações (editar, excluir)
- Nova página `src/pages/TakerForm.tsx` para criar/editar tomador (com busca de CNPJ via BrasilAPI e CEP)
- Toggle "Enviar e-mail automaticamente ao emitir nota" visível no formulário
- Menu no sidebar: "Tomadores" com ícone `UserRound`

---

### 3. Integração com o Wizard de emissão (StepTomador)

- No passo "Tomador do Serviço", além do botão "Últimos tomadores" (que busca de notas anteriores), adicionar botão **"Buscar da base"** que abre a lista de tomadores cadastrados para seleção rápida
- Ao selecionar, preenche automaticamente todos os campos

---

### 4. Envio automático de e-mail após emissão

- Na edge function `emit-nfse` (ou no fluxo pós-emissão no frontend), após emissão autorizada:
  - Verificar se o tomador existe na tabela `service_takers` com `auto_send_email = true`
  - Se sim, disparar e-mail para o tomador contendo links/anexos do XML e PDF da nota

- **Implementação do e-mail**: Será necessário configurar o domínio de e-mail via Cloud → Emails. Se ainda não configurado, prepararemos a lógica e o template, mas o disparo real dependerá da configuração do domínio.

---

### 5. Permissões

- Reutilizar `can_manage_companies` para acesso à tela de tomadores (ou criar permissão dedicada se preferir)
- Rota protegida por `PermissionGate`

---

### Arquivos envolvidos

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/Takers.tsx` |
| Criar | `src/pages/TakerForm.tsx` |
| Editar | `src/components/AppSidebar.tsx` (novo menu) |
| Editar | `src/App.tsx` (novas rotas) |
| Editar | `src/components/invoice/StepTomador.tsx` (botão buscar da base) |
| Editar | `src/pages/Invoices.tsx` ou `emit-nfse` (lógica pós-emissão) |
| Migration | Nova tabela `service_takers` |

