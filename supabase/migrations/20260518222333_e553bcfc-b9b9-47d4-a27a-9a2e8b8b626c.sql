-- Operational CMS hardening: trigger-maintained search indexing, correct member links, and stricter private media access.

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION public.update_content_search_vector()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('portuguese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.subtitle, '')), 'B') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('portuguese', coalesce(NEW.body_md, '')), 'D') ||
    setweight(to_tsvector('portuguese', coalesce(array_to_string(NEW.tags, ' '), '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_search_vector_refresh ON public.content;
CREATE TRIGGER content_search_vector_refresh
BEFORE INSERT OR UPDATE OF title, subtitle, description, body_md, tags
ON public.content
FOR EACH ROW EXECUTE FUNCTION public.update_content_search_vector();

UPDATE public.content
SET title = title
WHERE search_vector IS NULL;

CREATE INDEX IF NOT EXISTS content_search_vector_idx ON public.content USING gin(search_vector);
CREATE INDEX IF NOT EXISTS content_published_feed_idx ON public.content(status, publish_at, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS collection_items_unique_sort_idx ON public.collection_items(collection_id, sort_order, content_id);

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

  RETURN EXISTS (
    SELECT 1
    FROM public.content c
    WHERE c.status = 'published'
      AND (c.publish_at IS NULL OR c.publish_at <= now())
      AND public.has_content_access(_uid, c.visibility, c.required_plan_id)
      AND (
        (c.storage_bucket = _bucket AND c.storage_path = _path)
        OR (c.thumbnail_bucket = _bucket AND c.thumbnail_url = _path)
        OR (c.banner_bucket = _bucket AND c.banner_path = _path)
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

CREATE OR REPLACE FUNCTION public.notify_new_published_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published'
     AND (NEW.publish_at IS NULL OR NEW.publish_at <= now())
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status OR OLD.publish_at IS DISTINCT FROM NEW.publish_at) THEN
    INSERT INTO public.notifications (user_id, kind, title, body, link, payload)
    SELECT p.id,
           'new_content',
           'Nova publicação no observatório',
           NEW.title,
           '/app/content/' || NEW.slug,
           jsonb_build_object('content_id', NEW.id, 'content_kind', NEW.content_kind, 'type', NEW.type)
    FROM public.profiles p
    LEFT JOIN public.user_preferences up ON up.user_id = p.id
    WHERE COALESCE(up.notify_new_content, true) = true
      AND public.has_content_access(p.id, NEW.visibility, NEW.required_plan_id)
      AND p.suspended_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

UPDATE storage.buckets
SET public = false
WHERE id IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments');