CREATE OR REPLACE FUNCTION public.can_read_storage_object(_bucket TEXT, _path TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  IF public.has_role(_uid, 'admin') THEN
    RETURN true;
  END IF;

  IF _bucket IN ('thumbnails', 'banners') THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.content c
      WHERE c.status = 'published'
        AND (c.publish_at IS NULL OR c.publish_at <= now())
        AND (
          (c.thumbnail_bucket = _bucket AND c.thumbnail_url = _path)
          OR (c.banner_bucket = _bucket AND c.banner_path = _path)
        )
    ) OR EXISTS (
      SELECT 1
      FROM public.media_assets ma
      JOIN public.content c ON c.id = ma.content_id
      WHERE ma.bucket = _bucket
        AND ma.path = _path
        AND ma.status IN ('uploaded', 'attached')
        AND ma.asset_role IN ('thumbnail', 'banner', 'preview')
        AND c.status = 'published'
        AND (c.publish_at IS NULL OR c.publish_at <= now())
    );
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.content c
    WHERE c.status = 'published'
      AND (c.publish_at IS NULL OR c.publish_at <= now())
      AND public.has_content_access(_uid, c.visibility, c.required_plan_id)
      AND (
        (c.storage_bucket = _bucket AND c.storage_path = _path)
        OR (c.trailer_bucket = _bucket AND c.trailer_path = _path)
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.media_assets ma
    JOIN public.content c ON c.id = ma.content_id
    WHERE ma.bucket = _bucket
      AND ma.path = _path
      AND ma.status IN ('uploaded', 'attached')
      AND c.status = 'published'
      AND (c.publish_at IS NULL OR c.publish_at <= now())
      AND public.has_content_access(_uid, c.visibility, c.required_plan_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_read_storage_object(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_storage_object(TEXT, TEXT) TO service_role;