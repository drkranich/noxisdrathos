-- Harden privileged helper execution permissions after publishing migration.
REVOKE ALL ON FUNCTION public.current_user_plan(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_content_access(UUID, public.content_visibility, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_read_storage_object(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_published_content() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.current_user_plan(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.has_content_access(UUID, public.content_visibility, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_read_storage_object(TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_published_content() TO service_role;