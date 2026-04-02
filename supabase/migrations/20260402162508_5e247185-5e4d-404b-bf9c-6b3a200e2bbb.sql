
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL CHECK (sender_type IN ('admin', 'client')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can view their messages" ON public.support_messages
  FOR SELECT TO public USING (tenant_id IN (SELECT get_user_tenant_ids()));

CREATE POLICY "Clients can send messages" ON public.support_messages
  FOR INSERT TO public WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) AND sender_type = 'client');

CREATE POLICY "Clients can mark admin messages as read" ON public.support_messages
  FOR UPDATE TO public USING (tenant_id IN (SELECT get_user_tenant_ids()) AND sender_type = 'admin')
  WITH CHECK (tenant_id IN (SELECT get_user_tenant_ids()) AND sender_type = 'admin');

CREATE POLICY "Admins can view all messages" ON public.support_messages
  FOR SELECT TO authenticated USING (is_platform_admin(auth.uid()));

CREATE POLICY "Admins can send messages" ON public.support_messages
  FOR INSERT TO authenticated WITH CHECK (is_platform_admin(auth.uid()) AND sender_type = 'admin');

CREATE POLICY "Admins can mark client messages as read" ON public.support_messages
  FOR UPDATE TO authenticated USING (is_platform_admin(auth.uid()) AND sender_type = 'client')
  WITH CHECK (is_platform_admin(auth.uid()) AND sender_type = 'client');

CREATE INDEX idx_support_messages_tenant ON public.support_messages(tenant_id);
CREATE INDEX idx_support_messages_unread ON public.support_messages(tenant_id, sender_type, is_read) WHERE is_read = false;

ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
