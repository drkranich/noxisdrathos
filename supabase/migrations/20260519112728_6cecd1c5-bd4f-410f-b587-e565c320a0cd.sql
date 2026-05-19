CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role::text IN ('admin', 'super_admin')
  )
$$;

DO $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT ur.user_id INTO owner_id
  FROM public.user_roles ur
  WHERE ur.role::text = 'admin'
  ORDER BY ur.created_at DESC
  LIMIT 1;

  IF owner_id IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (owner_id, 'admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (owner_id, 'super_admin'::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.has_content_access(_user_id uuid, _visibility public.content_visibility, _required_plan_id text DEFAULT 'free'::text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN _visibility = 'public'::public.content_visibility AND public.plan_rank(_required_plan_id) = 0
    WHEN public.is_admin(_user_id) THEN true
    WHEN _visibility = 'public'::public.content_visibility THEN public.plan_rank(public.current_user_plan(_user_id)) >= public.plan_rank(_required_plan_id)
    WHEN _visibility = 'members'::public.content_visibility THEN public.plan_rank(public.current_user_plan(_user_id)) >= public.plan_rank(_required_plan_id)
    WHEN _visibility = 'premium'::public.content_visibility THEN public.plan_rank(public.current_user_plan(_user_id)) >= GREATEST(2, public.plan_rank(_required_plan_id))
    ELSE false
  END
$$;

CREATE OR REPLACE FUNCTION public.can_read_storage_object(_bucket text, _path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN false;
  END IF;

  IF public.is_admin(_uid) THEN
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

DROP TRIGGER IF EXISTS content_search_vector_refresh ON public.content;
CREATE TRIGGER content_search_vector_refresh
BEFORE INSERT OR UPDATE OF title, subtitle, description, body_md, tags ON public.content
FOR EACH ROW EXECUTE FUNCTION public.update_content_search_vector();

DROP TRIGGER IF EXISTS content_notify_new_published ON public.content;
CREATE TRIGGER content_notify_new_published
AFTER INSERT OR UPDATE OF status, publish_at ON public.content
FOR EACH ROW EXECUTE FUNCTION public.notify_new_published_content();

DROP TRIGGER IF EXISTS content_touch ON public.content;
CREATE TRIGGER content_touch
BEFORE UPDATE ON public.content
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS media_assets_touch ON public.media_assets;
CREATE TRIGGER media_assets_touch
BEFORE UPDATE ON public.media_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS collections_touch ON public.collections;
CREATE TRIGGER collections_touch
BEFORE UPDATE ON public.collections
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "Admins manage content" ON public.content;
CREATE POLICY "Admins manage content"
ON public.content
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins read all content" ON public.content;
CREATE POLICY "Admins read all content"
ON public.content
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage media assets" ON public.media_assets;
CREATE POLICY "Admins manage media assets"
ON public.media_assets
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage collections" ON public.collections;
CREATE POLICY "Admins manage collections"
ON public.collections
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage collection items" ON public.collection_items;
CREATE POLICY "Admins manage collection items"
ON public.collection_items
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins write logs" ON public.admin_logs;
CREATE POLICY "Admins write logs"
ON public.admin_logs
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()) AND auth.uid() = actor_id);

DROP POLICY IF EXISTS "Admins read logs" ON public.admin_logs;
CREATE POLICY "Admins read logs"
ON public.admin_logs
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins manage protected publishing media" ON storage.objects;
CREATE POLICY "Admins manage protected publishing media"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments')
  AND public.is_admin(auth.uid())
)
WITH CHECK (
  bucket_id IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments')
  AND public.is_admin(auth.uid())
);

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('videos', 'videos', false),
  ('pdfs', 'pdfs', false),
  ('audio', 'audio', false),
  ('thumbnails', 'thumbnails', false),
  ('banners', 'banners', false),
  ('attachments', 'attachments', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DO $$
BEGIN
  ALTER TABLE public.content REPLICA IDENTITY FULL;
  ALTER TABLE public.media_assets REPLICA IDENTITY FULL;
  ALTER TABLE public.collections REPLICA IDENTITY FULL;
  ALTER TABLE public.collection_items REPLICA IDENTITY FULL;

  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.content; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.media_assets; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.collections; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;