
-- Replace overly permissive INSERT policy with a service-role-only approach
-- Drop the old policy
DROP POLICY "System can insert notifications" ON public.admin_notifications;

-- Triggers run as SECURITY DEFINER which bypasses RLS, so no INSERT policy needed for triggers.
-- But we still need platform admins to be able to delete old notifications
CREATE POLICY "Platform admins can delete notifications"
ON public.admin_notifications
FOR DELETE
TO authenticated
USING (public.is_platform_admin(auth.uid()));
