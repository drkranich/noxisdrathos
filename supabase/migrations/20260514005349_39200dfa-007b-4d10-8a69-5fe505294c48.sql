ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz;

-- Admins already have ALL on profiles via existing policy, so suspension via UPDATE works.
