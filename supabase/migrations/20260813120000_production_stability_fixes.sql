-- Production stability: profiles access, profile_follows schema, RPC grants, challenge columns.

-- ---------------------------------------------------------------------------
-- 1) profile_follows: unify following_profile_id -> profile_id (legacy Lovable)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_follows'
      AND column_name = 'following_profile_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profile_follows'
      AND column_name = 'profile_id'
  ) THEN
    ALTER TABLE public.profile_follows
      RENAME COLUMN following_profile_id TO profile_id;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS profile_follows_follower_profile_key
  ON public.profile_follows (follower_id, profile_id);

GRANT SELECT, INSERT, DELETE ON public.profile_follows TO authenticated;
GRANT ALL ON public.profile_follows TO service_role;

ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own follows" ON public.profile_follows;
DROP POLICY IF EXISTS "Users manage own follows" ON public.profile_follows;
DROP POLICY IF EXISTS "Users view follows of themselves" ON public.profile_follows;

CREATE POLICY "profile_follows_select_authenticated"
  ON public.profile_follows FOR SELECT TO authenticated
  USING (auth.uid() = follower_id OR auth.uid() = profile_id);

CREATE POLICY "profile_follows_insert_own"
  ON public.profile_follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "profile_follows_delete_own"
  ON public.profile_follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- 2) profiles: restore table grants and owner-only write policies
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_authenticated_read" ON public.profiles;
CREATE POLICY "profiles_authenticated_read"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "profiles_self_insert" ON public.profiles;
CREATE POLICY "profiles_self_insert"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- 3) Follow RPCs aligned with profile_id column
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.follow_profile(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  IF v_uid = p_profile_id THEN
    RETURN json_build_object('error', 'Cannot follow yourself');
  END IF;
  INSERT INTO public.profile_follows (follower_id, profile_id)
  VALUES (v_uid, p_profile_id)
  ON CONFLICT (follower_id, profile_id) DO NOTHING;
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_profile(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;
  DELETE FROM public.profile_follows
  WHERE follower_id = v_uid AND profile_id = p_profile_id;
  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_profile_follows(p_profile_id uuid, p_limit int DEFAULT 9)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  username text,
  apelido text,
  avatar_url text,
  category text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.apelido,
    p.avatar_url,
    COALESCE(p.level, p.posicao_principal)::text
  FROM public.profile_follows pf
  JOIN public.profiles p ON p.id = pf.profile_id
  WHERE pf.follower_id = p_profile_id
  ORDER BY pf.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_public_profile_followers(p_profile_id uuid, p_limit int DEFAULT 12)
RETURNS TABLE (
  profile_id uuid,
  display_name text,
  username text,
  apelido text,
  avatar_url text,
  category text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.display_name,
    p.username,
    p.apelido,
    p.avatar_url,
    COALESCE(p.level, p.posicao_principal)::text
  FROM public.profile_follows pf
  JOIN public.profiles p ON p.id = pf.follower_id
  WHERE pf.profile_id = p_profile_id
  ORDER BY pf.created_at DESC
  LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_public_profile_followers(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_public_profile_followers(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_public_profile_followers(uuid, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profile_followers(uuid, integer) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.list_public_profile_follows(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_profile_follows(uuid, integer) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.follow_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.follow_profile(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.unfollow_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unfollow_profile(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4) challenges: optional admin-review columns (missing in some production DBs)
-- ---------------------------------------------------------------------------
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS score_admin_review_requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_admin_review_requested_at TIMESTAMPTZ;

DO $$
BEGIN
  IF to_regprocedure('public.request_challenge_score_admin_review(uuid)') IS NOT NULL THEN
    REVOKE ALL ON FUNCTION public.request_challenge_score_admin_review(uuid) FROM PUBLIC, anon;
    GRANT EXECUTE ON FUNCTION public.request_challenge_score_admin_review(uuid) TO authenticated;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 5) Court availability RPC grants omitted from phase-2 least-privilege sweep
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.get_available_courts(date,time without time zone,time without time zone,uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_available_courts(date, time without time zone, time without time zone, uuid) TO authenticated;
  END IF;
  IF to_regprocedure('public.get_available_time_slots(date,uuid)') IS NOT NULL THEN
    GRANT EXECUTE ON FUNCTION public.get_available_time_slots(date, uuid) TO authenticated;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
