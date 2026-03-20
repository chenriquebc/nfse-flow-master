
-- Make is_platform_admin callable via RPC (it already exists as SECURITY DEFINER)
-- Just grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;
