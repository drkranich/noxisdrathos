
-- Revoke broad execute, grant only to authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_active_membership(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_membership(UUID) TO authenticated;

-- Restrict thumbnails public read: require authenticated
DROP POLICY "Thumbnails public read" ON storage.objects;
CREATE POLICY "Thumbnails read by authenticated" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'thumbnails');

UPDATE storage.buckets SET public = false WHERE id = 'thumbnails';
