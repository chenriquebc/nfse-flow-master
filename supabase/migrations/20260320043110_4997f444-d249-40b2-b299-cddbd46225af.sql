
-- Create admin notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'new_account', 'overdue', 'suspended', 'reactivated', 'plan_change'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only platform admins can read notifications
CREATE POLICY "Platform admins can view notifications"
ON public.admin_notifications
FOR SELECT
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- Only platform admins can update (mark as read)
CREATE POLICY "Platform admins can update notifications"
ON public.admin_notifications
FOR UPDATE
TO authenticated
USING (public.is_platform_admin(auth.uid()));

-- System can insert (via triggers using SECURITY DEFINER)
CREATE POLICY "System can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Index for fast unread count queries
CREATE INDEX idx_admin_notifications_unread ON public.admin_notifications (is_read, created_at DESC);

-- Trigger function: notify on new tenant creation
CREATE OR REPLACE FUNCTION public.notify_new_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.admin_notifications (type, title, message, tenant_id, metadata)
  VALUES (
    'new_account',
    'Nova conta criada',
    'O escritório "' || NEW.name || '" acabou de se cadastrar no plano ' || NEW.plan || '.',
    NEW.id,
    jsonb_build_object('plan', NEW.plan, 'email', NEW.email)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_tenant
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.notify_new_tenant();

-- Trigger function: notify on tenant status changes (overdue, suspended, reactivated)
CREATE OR REPLACE FUNCTION public.notify_tenant_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _type TEXT;
  _title TEXT;
  _message TEXT;
BEGIN
  -- Detect overdue
  IF NEW.subscription_status = 'past_due' AND OLD.subscription_status != 'past_due' THEN
    _type := 'overdue';
    _title := 'Conta inadimplente';
    _message := 'O escritório "' || NEW.name || '" está com pagamento em atraso.';
  -- Detect suspension
  ELSIF NEW.is_active = false AND OLD.is_active = true THEN
    _type := 'suspended';
    _title := 'Conta suspensa';
    _message := 'O escritório "' || NEW.name || '" foi suspenso.';
  -- Detect reactivation
  ELSIF NEW.is_active = true AND OLD.is_active = false THEN
    _type := 'reactivated';
    _title := 'Conta reativada';
    _message := 'O escritório "' || NEW.name || '" foi reativado.';
  -- Detect plan change
  ELSIF NEW.plan != OLD.plan THEN
    _type := 'plan_change';
    _title := 'Plano alterado';
    _message := 'O escritório "' || NEW.name || '" mudou de ' || OLD.plan || ' para ' || NEW.plan || '.';
  -- Detect cancellation
  ELSIF NEW.subscription_status = 'canceled' AND OLD.subscription_status != 'canceled' THEN
    _type := 'suspended';
    _title := 'Conta cancelada';
    _message := 'O escritório "' || NEW.name || '" cancelou a assinatura.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.admin_notifications (type, title, message, tenant_id, metadata)
  VALUES (
    _type,
    _title,
    _message,
    NEW.id,
    jsonb_build_object('old_status', OLD.subscription_status, 'new_status', NEW.subscription_status, 'old_plan', OLD.plan, 'new_plan', NEW.plan)
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_tenant_status_change
AFTER UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.notify_tenant_status_change();
