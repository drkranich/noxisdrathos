CREATE POLICY "Anon read public content"
ON public.content
FOR SELECT
TO anon
USING (
  status = 'published'
  AND visibility = 'public'
  AND (publish_at IS NULL OR publish_at <= now())
);

CREATE POLICY "Anon read categories"
ON public.categories
FOR SELECT
TO anon
USING (true);