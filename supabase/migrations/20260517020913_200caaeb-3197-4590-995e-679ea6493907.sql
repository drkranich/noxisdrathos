DROP POLICY IF EXISTS "Members read plan-eligible published content" ON public.content;
CREATE POLICY "Members read published content previews"
ON public.content
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (publish_at IS NULL OR publish_at <= now())
);

DROP POLICY IF EXISTS "Members read accessible collections" ON public.collections;
CREATE POLICY "Members read published collection previews"
ON public.collections
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (publish_at IS NULL OR publish_at <= now())
);

DROP POLICY IF EXISTS "Members read accessible collection items" ON public.collection_items;
CREATE POLICY "Members read published collection items"
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
  )
);