
-- 1) Realtime: lock down realtime.messages so only admins can subscribe via postgres_changes broker.
-- Private user channels are already off the publication; this is an extra guard on the broadcast table.
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read realtime messages" ON realtime.messages;
CREATE POLICY "Admins read realtime messages"
ON realtime.messages
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins write realtime messages" ON realtime.messages;
CREATE POLICY "Admins write realtime messages"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- 2) Announcements: members should never see admin-audience rows.
DROP POLICY IF EXISTS "Members read announcements" ON public.announcements;
CREATE POLICY "Members read announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  is_active
  AND publish_at <= now()
  AND (expires_at IS NULL OR expires_at > now())
  AND (
    audience IN ('public', 'members')
    OR public.is_admin(auth.uid())
  )
);
