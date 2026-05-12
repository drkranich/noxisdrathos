
-- =========================================
-- ROLES
-- =========================================
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users read own roles" ON public.user_roles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- PROFILES
-- =========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles viewable by authenticated" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- CATEGORIES
-- =========================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories readable by authenticated" ON public.categories
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage categories" ON public.categories
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- CONTENT
-- =========================================
CREATE TYPE public.content_type AS ENUM ('video', 'pdf', 'audio', 'article');
CREATE TYPE public.content_status AS ENUM ('draft', 'scheduled', 'published', 'archived');
CREATE TYPE public.content_visibility AS ENUM ('public', 'members', 'premium');

CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  body_md TEXT,
  type public.content_type NOT NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  visibility public.content_visibility NOT NULL DEFAULT 'members',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  thumbnail_url TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  external_url TEXT,
  duration_seconds INT,
  reading_minutes INT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  publish_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX content_status_idx ON public.content(status);
CREATE INDEX content_type_idx ON public.content(type);
CREATE INDEX content_category_idx ON public.content(category_id);
CREATE INDEX content_featured_idx ON public.content(is_featured) WHERE is_featured = true;

ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER content_touch BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Members see published + (public or members visibility)
CREATE POLICY "Members read published content" ON public.content
  FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (publish_at IS NULL OR publish_at <= now())
    AND visibility IN ('public', 'members', 'premium')
  );

CREATE POLICY "Admins read all content" ON public.content
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage content" ON public.content
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- MEMBERSHIPS / SUBSCRIPTIONS
-- =========================================
CREATE TYPE public.membership_status AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'inactive');

CREATE TABLE public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free',
  status public.membership_status NOT NULL DEFAULT 'inactive',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own membership" ON public.memberships
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all memberships" ON public.memberships
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage memberships" ON public.memberships
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER memberships_touch BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Helper: is user "premium" (active or trialing)
CREATE OR REPLACE FUNCTION public.has_active_membership(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships
    WHERE user_id = _user_id
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  )
$$;

-- =========================================
-- WATCH HISTORY + BOOKMARKS
-- =========================================
CREATE TABLE public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  progress_seconds INT NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own history" ON public.watch_history
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'favorite',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id, kind)
);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================================
-- COMMENTS
-- =========================================
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX comments_content_idx ON public.comments(content_id);

CREATE POLICY "Members read visible comments" ON public.comments
  FOR SELECT TO authenticated
  USING (is_hidden = false OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Members create comments" ON public.comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users edit own comments" ON public.comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins moderate comments" ON public.comments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER comments_touch BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================================
-- STORAGE BUCKETS
-- =========================================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('thumbnails', 'thumbnails', true),
  ('videos', 'videos', false),
  ('pdfs', 'pdfs', false)
ON CONFLICT (id) DO NOTHING;

-- Thumbnails: public read, admin write
CREATE POLICY "Thumbnails public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'thumbnails');
CREATE POLICY "Admins write thumbnails" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'thumbnails' AND public.has_role(auth.uid(), 'admin'));

-- Videos: members can read (signed URL gateway), admins manage
CREATE POLICY "Members read videos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'videos');
CREATE POLICY "Admins manage videos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'videos' AND public.has_role(auth.uid(), 'admin'));

-- PDFs: same model
CREATE POLICY "Members read pdfs" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pdfs');
CREATE POLICY "Admins manage pdfs" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'pdfs' AND public.has_role(auth.uid(), 'admin'));
