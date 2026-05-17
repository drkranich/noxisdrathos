-- Publishing operations foundation: plan-aware content, media assets, collections, and private storage access.

-- Ensure required private buckets exist.
INSERT INTO storage.buckets (id, name, public) VALUES
  ('audio', 'audio', false),
  ('banners', 'banners', false),
  ('attachments', 'attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Keep all publishing buckets private.
UPDATE storage.buckets
SET public = false
WHERE id IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments');

-- Extend content with operational CMS fields while preserving the existing enum columns.
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS content_kind TEXT NOT NULL DEFAULT 'article',
  ADD COLUMN IF NOT EXISTS required_plan_id TEXT NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS preview_md TEXT,
  ADD COLUMN IF NOT EXISTS thumbnail_bucket TEXT NOT NULL DEFAULT 'thumbnails',
  ADD COLUMN IF NOT EXISTS banner_bucket TEXT,
  ADD COLUMN IF NOT EXISTS banner_path TEXT,
  ADD COLUMN IF NOT EXISTS trailer_bucket TEXT,
  ADD COLUMN IF NOT EXISTS trailer_path TEXT,
  ADD COLUMN IF NOT EXISTS attachment_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS media_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_content_kind_check,
  ADD CONSTRAINT content_content_kind_check CHECK (
    content_kind IN ('article', 'video', 'pdf', 'audio', 'report', 'briefing', 'premium_drop', 'collection', 'hero_banner')
  );

ALTER TABLE public.content
  DROP CONSTRAINT IF EXISTS content_required_plan_id_check,
  ADD CONSTRAINT content_required_plan_id_check CHECK (
    required_plan_id IN ('free', 'circle', 'vault', 'council', 'premium', 'vip', 'beta')
  );

CREATE INDEX IF NOT EXISTS content_kind_idx ON public.content(content_kind);
CREATE INDEX IF NOT EXISTS content_required_plan_idx ON public.content(required_plan_id);
CREATE INDEX IF NOT EXISTS content_sort_order_idx ON public.content(sort_order);
CREATE INDEX IF NOT EXISTS content_publish_state_idx ON public.content(status, publish_at, visibility, required_plan_id);
CREATE INDEX IF NOT EXISTS content_tags_gin_idx ON public.content USING gin(tags);

-- Plan helpers for access enforcement.
CREATE OR REPLACE FUNCTION public.plan_rank(_plan TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE lower(coalesce(_plan, 'free'))
    WHEN 'free' THEN 0
    WHEN 'circle' THEN 1
    WHEN 'vault' THEN 2
    WHEN 'premium' THEN 2
    WHEN 'council' THEN 3
    WHEN 'vip' THEN 3
    WHEN 'beta' THEN 4
    ELSE 0
  END
$$;

CREATE OR REPLACE FUNCTION public.current_user_plan(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH active_memberships AS (
    SELECT plan
    FROM public.memberships
    WHERE user_id = _user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ),
  active_subscriptions AS (
    SELECT CASE
      WHEN price_id = 'council_yearly' THEN 'council'
      WHEN price_id = 'vault_monthly' THEN 'vault'
      WHEN price_id = 'circle_monthly' THEN 'circle'
      ELSE 'free'
    END AS plan
    FROM public.subscriptions
    WHERE user_id = _user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  ),
  ranked AS (
    SELECT plan FROM active_memberships
    UNION ALL
    SELECT plan FROM active_subscriptions
  )
  SELECT COALESCE(
    (SELECT plan FROM ranked ORDER BY public.plan_rank(plan) DESC LIMIT 1),
    'free'
  )
$$;

CREATE OR REPLACE FUNCTION public.has_content_access(
  _user_id UUID,
  _visibility public.content_visibility,
  _required_plan_id TEXT DEFAULT 'free'
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN _visibility = 'public'::public.content_visibility AND public.plan_rank(_required_plan_id) = 0
    WHEN public.has_role(_user_id, 'admin') THEN true
    WHEN _visibility = 'public'::public.content_visibility THEN public.plan_rank(public.current_user_plan(_user_id)) >= public.plan_rank(_required_plan_id)
    WHEN _visibility = 'members'::public.content_visibility THEN public.plan_rank(public.current_user_plan(_user_id)) >= public.plan_rank(_required_plan_id)
    WHEN _visibility = 'premium'::public.content_visibility THEN public.plan_rank(public.current_user_plan(_user_id)) >= GREATEST(2, public.plan_rank(_required_plan_id))
    ELSE false
  END
$$;

-- Replace broad content access with plan-aware access.
DROP POLICY IF EXISTS "Members read published content" ON public.content;
CREATE POLICY "Members read plan-eligible published content"
ON public.content
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (publish_at IS NULL OR publish_at <= now())
  AND public.has_content_access(auth.uid(), visibility, required_plan_id)
);

DROP POLICY IF EXISTS "Anon read public content" ON public.content;
CREATE POLICY "Anon read public free published content"
ON public.content
FOR SELECT
TO anon
USING (
  status = 'published'
  AND visibility = 'public'
  AND required_plan_id = 'free'
  AND (publish_at IS NULL OR publish_at <= now())
);

-- Media asset registry for upload diagnostics and protected delivery.
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  asset_role TEXT NOT NULL DEFAULT 'primary',
  status TEXT NOT NULL DEFAULT 'uploaded',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bucket, path)
);

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_bucket_check,
  ADD CONSTRAINT media_assets_bucket_check CHECK (bucket IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments'));

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_role_check,
  ADD CONSTRAINT media_assets_role_check CHECK (asset_role IN ('primary', 'thumbnail', 'banner', 'trailer', 'attachment', 'preview'));

ALTER TABLE public.media_assets
  DROP CONSTRAINT IF EXISTS media_assets_status_check,
  ADD CONSTRAINT media_assets_status_check CHECK (status IN ('uploading', 'uploaded', 'attached', 'failed', 'removed'));

CREATE INDEX IF NOT EXISTS media_assets_content_idx ON public.media_assets(content_id);
CREATE INDEX IF NOT EXISTS media_assets_bucket_path_idx ON public.media_assets(bucket, path);
CREATE INDEX IF NOT EXISTS media_assets_role_idx ON public.media_assets(asset_role);
CREATE INDEX IF NOT EXISTS media_assets_status_idx ON public.media_assets(status);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS media_assets_touch ON public.media_assets;
CREATE TRIGGER media_assets_touch BEFORE UPDATE ON public.media_assets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "Admins manage media assets" ON public.media_assets;
CREATE POLICY "Admins manage media assets"
ON public.media_assets
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members read accessible media metadata" ON public.media_assets;
CREATE POLICY "Members read accessible media metadata"
ON public.media_assets
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = media_assets.content_id
      AND c.status = 'published'
      AND (c.publish_at IS NULL OR c.publish_at <= now())
      AND public.has_content_access(auth.uid(), c.visibility, c.required_plan_id)
  )
);

-- Collections for curated publishing.
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility public.content_visibility NOT NULL DEFAULT 'members',
  required_plan_id TEXT NOT NULL DEFAULT 'free',
  status public.content_status NOT NULL DEFAULT 'draft',
  publish_at TIMESTAMPTZ,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  thumbnail_bucket TEXT,
  thumbnail_path TEXT,
  banner_bucket TEXT,
  banner_path TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT collections_required_plan_id_check CHECK (required_plan_id IN ('free', 'circle', 'vault', 'council', 'premium', 'vip', 'beta'))
);

CREATE INDEX IF NOT EXISTS collections_status_idx ON public.collections(status, publish_at);
CREATE INDEX IF NOT EXISTS collections_featured_idx ON public.collections(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS collections_sort_order_idx ON public.collections(sort_order);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS collections_touch ON public.collections;
CREATE TRIGGER collections_touch BEFORE UPDATE ON public.collections
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP POLICY IF EXISTS "Admins manage collections" ON public.collections;
CREATE POLICY "Admins manage collections"
ON public.collections
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members read accessible collections" ON public.collections;
CREATE POLICY "Members read accessible collections"
ON public.collections
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (publish_at IS NULL OR publish_at <= now())
  AND public.has_content_access(auth.uid(), visibility, required_plan_id)
);

DROP POLICY IF EXISTS "Anon read public free collections" ON public.collections;
CREATE POLICY "Anon read public free collections"
ON public.collections
FOR SELECT
TO anon
USING (
  status = 'published'
  AND visibility = 'public'
  AND required_plan_id = 'free'
  AND (publish_at IS NULL OR publish_at <= now())
);

CREATE TABLE IF NOT EXISTS public.collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(collection_id, content_id)
);

CREATE INDEX IF NOT EXISTS collection_items_collection_idx ON public.collection_items(collection_id, sort_order);
CREATE INDEX IF NOT EXISTS collection_items_content_idx ON public.collection_items(content_id);

ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage collection items" ON public.collection_items;
CREATE POLICY "Admins manage collection items"
ON public.collection_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Members read accessible collection items" ON public.collection_items;
CREATE POLICY "Members read accessible collection items"
ON public.collection_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.collections col
    WHERE col.id = collection_items.collection_id
      AND col.status = 'published'
      AND (col.publish_at IS NULL OR col.publish_at <= now())
      AND public.has_content_access(auth.uid(), col.visibility, col.required_plan_id)
  )
);

-- Protected storage lookup. Uses content/media access rather than public bucket URLs.
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

-- Replace storage policies for publishing buckets.
DROP POLICY IF EXISTS "Thumbnails public read" ON storage.objects;
DROP POLICY IF EXISTS "Thumbnails read by authenticated" ON storage.objects;
DROP POLICY IF EXISTS "Admins write thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Members read videos" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage videos" ON storage.objects;
DROP POLICY IF EXISTS "Members read pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage pdfs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated read protected publishing media" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage protected publishing media" ON storage.objects;

CREATE POLICY "Authenticated read protected publishing media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments')
  AND public.can_read_storage_object(bucket_id, name)
);

CREATE POLICY "Admins manage protected publishing media"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments')
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id IN ('videos', 'pdfs', 'audio', 'thumbnails', 'banners', 'attachments')
  AND public.has_role(auth.uid(), 'admin')
);

-- Live publishing notifications.
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
           '/explore/' || NEW.slug,
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

DROP TRIGGER IF EXISTS content_notify_new_published ON public.content;
CREATE TRIGGER content_notify_new_published
AFTER INSERT OR UPDATE OF status, publish_at ON public.content
FOR EACH ROW EXECUTE FUNCTION public.notify_new_published_content();

-- Realtime for operations surfaces. Duplicate add-table attempts are ignored.
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.content REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.content;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.media_assets REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.media_assets;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.collections REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collections;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.collection_items REPLICA IDENTITY FULL;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.collection_items;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;