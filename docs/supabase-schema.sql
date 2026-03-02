-- Waypoints: paste this into Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Creates tables that match shared/schema.ts. Link profiles to Supabase Auth via user_id.
-- If profiles already exists, add name/avatar: ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name text; ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name text; ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

-- Optional: extend auth.users or create a trigger to auto-create a profile on signup (see bottom).

-- =============================================================================
-- 1. PROFILES (one per user when linked to Auth; id stays for backward compatibility)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id serial PRIMARY KEY,
  user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  avatar_url text,
  branch text NOT NULL DEFAULT 'Marine Corps',
  rank text NOT NULL DEFAULT 'E5',
  mos text NOT NULL DEFAULT '',
  is_pro boolean NOT NULL DEFAULT false,
  readiness_score integer NOT NULL DEFAULT 0,
  readiness_status text NOT NULL DEFAULT 'incomplete',
  pft_score integer NOT NULL DEFAULT 0,
  vault_password text,
  vault_lock_enabled boolean NOT NULL DEFAULT false,
  tis_months integer,
  tig_months integer,
  date_of_birth text,
  medical_clearance_expires_at text,
  pme_complete boolean NOT NULL DEFAULT false,
  last_readiness_check_at text
);

-- =============================================================================
-- 2. VAULT_ITEMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vault_items (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL,
  date text NOT NULL,
  expires_at text,
  extracted_fields jsonb NOT NULL DEFAULT '{}',
  verification_status text NOT NULL DEFAULT 'pending',
  source text NOT NULL DEFAULT 'manual_upload',
  upload_timestamp timestamptz NOT NULL DEFAULT now()
);

-- =============================================================================
-- 3. ALERTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  severity text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  due_date text,
  action_type text,
  related_vault_type text,
  is_read boolean NOT NULL DEFAULT false,
  resolved_at timestamptz
);

-- =============================================================================
-- 4. COMMUNITY_POSTS
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id serial PRIMARY KEY,
  profile_id integer NOT NULL DEFAULT 1 REFERENCES public.profiles(id) ON DELETE CASCADE,
  author text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  type text NOT NULL,
  milestone_card jsonb,
  milestone_event_type text,
  privacy text NOT NULL DEFAULT 'public',
  referral_code text,
  likes integer NOT NULL DEFAULT 0
);

-- =============================================================================
-- INDEXES (for common lookups)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_vault_items_profile_id ON public.vault_items(profile_id);
CREATE INDEX IF NOT EXISTS idx_alerts_profile_id ON public.alerts(profile_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_profile_id ON public.community_posts(profile_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- =============================================================================
-- OPTIONAL: Auto-create profile on first signup (Supabase Auth trigger)
-- Run this if you want every new auth user to get a profile row linked by user_id.
-- =============================================================================
-- CREATE OR REPLACE FUNCTION public.handle_new_user()
-- RETURNS trigger AS $$
-- BEGIN
--   INSERT INTO public.profiles (user_id, branch, rank, mos)
--   VALUES (NEW.id, 'Marine Corps', 'E5', '');
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;
--
-- Then run:
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

