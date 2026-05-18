-- Enforce plan-aware member visibility across library and collections.

DROP POLICY IF EXISTS "Members read published content previews" ON public.content;
DROP POLICY IF EXISTS "Members read plan-eligible published content" ON public.content;
CREATE POLICY "Members read plan-eligible published content"
ON public.content
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (publish_at IS NULL OR publish_at <= now())
  AND public.has_content_access(auth.uid(), visibility, required_plan_id)
);

DROP POLICY IF EXISTS "Members read published collection previews" ON public.collections;
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

DROP POLICY IF EXISTS "Members read published collection items" ON public.collection_items;
DROP POLICY IF EXISTS "Members read accessible collection items" ON public.collection_items;
CREATE POLICY "Members read accessible collection items"
ON public.collection_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.collections col
    JOIN public.content c ON c.id = collection_items.content_id
    WHERE col.id = collection_items.collection_id
      AND col.status = 'published'
      AND (col.publish_at IS NULL OR col.publish_at <= now())
      AND public.has_content_access(auth.uid(), col.visibility, col.required_plan_id)
      AND c.status = 'published'
      AND (c.publish_at IS NULL OR c.publish_at <= now())
      AND public.has_content_access(auth.uid(), c.visibility, c.required_plan_id)
  )
);