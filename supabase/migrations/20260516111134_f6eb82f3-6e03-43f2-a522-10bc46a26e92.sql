REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
-- has_role is still callable from RLS policies (they run as the policy owner), and from
-- SECURITY DEFINER functions. handle_new_user only needs to run from the auth.users trigger.