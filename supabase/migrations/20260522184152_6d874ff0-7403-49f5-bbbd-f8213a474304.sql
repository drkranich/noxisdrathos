
-- 1. Leads: restrict SELECT to admins only
DROP POLICY IF EXISTS "Authenticated users can read leads" ON public.leads;
CREATE POLICY "Admins read leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Realtime: remove private per-user tables from publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.watch_history;
ALTER PUBLICATION supabase_realtime DROP TABLE public.bookmarks;
ALTER PUBLICATION supabase_realtime DROP TABLE public.support_tickets;
ALTER PUBLICATION supabase_realtime DROP TABLE public.subscriptions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;

-- 3. collection_items: anon read for public free collections
CREATE POLICY "Anon read public free collection items"
  ON public.collection_items FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.collections col
      JOIN public.content c ON c.id = collection_items.content_id
      WHERE col.id = collection_items.collection_id
        AND col.status = 'published'::public.content_status
        AND col.visibility = 'public'::public.content_visibility
        AND col.required_plan_id = 'free'
        AND (col.publish_at IS NULL OR col.publish_at <= now())
        AND c.status = 'published'::public.content_status
        AND c.visibility = 'public'::public.content_visibility
        AND c.required_plan_id = 'free'
        AND (c.publish_at IS NULL OR c.publish_at <= now())
    )
  );

-- 4. media_assets: require content_id
ALTER TABLE public.media_assets ALTER COLUMN content_id SET NOT NULL;
