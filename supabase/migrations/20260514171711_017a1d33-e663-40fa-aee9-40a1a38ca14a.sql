-- Invoices (prepared for Stripe; populated via webhook later)
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending', -- pending | paid | failed | refunded
  provider text NOT NULL DEFAULT 'noop',  -- stripe | pix | noop
  provider_invoice_id text,
  hosted_invoice_url text,
  pdf_url text,
  period_start timestamptz,
  period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invoices_user ON public.invoices(user_id, created_at DESC);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own invoices" ON public.invoices FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage invoices" ON public.invoices FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Announcements (broadcast banners, member news)
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  level text NOT NULL DEFAULT 'info', -- info | warning | premium
  audience text NOT NULL DEFAULT 'members', -- public | members | premium
  is_active boolean NOT NULL DEFAULT true,
  publish_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anon read public announcements" ON public.announcements FOR SELECT TO anon
  USING (is_active AND audience = 'public' AND publish_at <= now() AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Members read announcements" ON public.announcements FOR SELECT TO authenticated
  USING (is_active AND publish_at <= now() AND (expires_at IS NULL OR expires_at > now()));
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admin audit log
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  target_table text,
  target_id text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_admin_logs_created ON public.admin_logs(created_at DESC);
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read logs" ON public.admin_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins write logs" ON public.admin_logs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin') AND auth.uid() = actor_id);

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open | in_progress | resolved | closed
  priority text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_user ON public.support_tickets(user_id, created_at DESC);
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins manage all tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE TRIGGER tickets_touch BEFORE UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();