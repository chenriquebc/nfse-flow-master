
## Plano: Sistema de Mensagens Admin ↔ Cliente

### Visão Geral

Criar um sistema de chat bidirecional entre o Admin da plataforma e os clientes (tenants). No painel Admin, uma nova aba "Contato" com lista de conversas por tenant. No painel do cliente, um botão flutuante arrastável com notificação de novas mensagens.

---

### 1. Tabela `support_messages` (Migration)

```sql
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'client')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- Clients can view/insert messages of their tenant
CREATE POLICY "Clients can view their messages" ON public.support_messages
  FOR SELECT TO public USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Clients can send messages" ON public.support_messages
  FOR INSERT TO public WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) AND sender_type = 'client');

CREATE POLICY "Clients can mark as read" ON public.support_messages
  FOR UPDATE TO public USING (tenant_id IN (SELECT get_user_tenant_ids()) AND sender_type = 'admin');

-- Platform admins full access
CREATE POLICY "Admins can view all messages" ON public.support_messages
  FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));

CREATE POLICY "Admins can send messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (is_platform_admin(auth.uid()) AND sender_type = 'admin');

CREATE POLICY "Admins can mark as read" ON public.support_messages
  FOR UPDATE TO authenticated USING (is_platform_admin(auth.uid()) AND sender_type = 'client');

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
```

---

### 2. Página Admin — "Contato" (`/admin/messages`)

**Arquivo:** `src/pages/admin/AdminMessages.tsx`

- Lista de tenants à esquerda com badge de mensagens não lidas
- Painel de chat à direita ao selecionar um tenant
- Envio de mensagens como `sender_type = 'admin'`
- Marcar como lidas automaticamente ao abrir conversa
- Realtime via `postgres_changes` para receber novas mensagens instantaneamente

**Alterações:**
- `AdminLayout.tsx`: adicionar `{ label: "Contato", href: "/admin/messages", icon: MessageCircle }` no `adminNav`
- `App.tsx`: adicionar rota `<Route path="messages" element={<AdminMessages />} />`

---

### 3. Widget flutuante do cliente — "Fale Conosco"

**Arquivo:** `src/components/SupportChatWidget.tsx`

- Botão flutuante (ícone `MessageCircle`) com badge de mensagens não lidas do admin
- Tooltip ao hover: "Sugestões, dúvidas ou contato — fale conosco!"
- Arrastável (drag) para qualquer posição na tela via `mousedown/mousemove/mouseup` e `touchstart/touchmove/touchend`
- Ao clicar, abre um painel (popover ou sheet) com o histórico de mensagens e campo de envio
- Realtime para receber respostas do admin instantaneamente
- Posição salva no `localStorage`

**Integração:** Renderizar em `AppLayout.tsx` para aparecer em todas as telas do cliente

---

### 4. Notificações

- No widget do cliente: badge com contagem de mensagens não lidas do admin
- No admin: badge na aba "Contato" no sidebar + atualização realtime

---

### Arquivos envolvidos

| Ação | Arquivo |
|------|---------|
| Migration | Nova tabela `support_messages` |
| Criar | `src/pages/admin/AdminMessages.tsx` |
| Criar | `src/components/SupportChatWidget.tsx` |
| Editar | `src/pages/admin/AdminLayout.tsx` (novo nav item) |
| Editar | `src/App.tsx` (nova rota admin) |
| Editar | `src/components/AppLayout.tsx` (renderizar widget) |
