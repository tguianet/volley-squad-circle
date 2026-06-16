
-- Tabela de follows entre perfis
CREATE TABLE IF NOT EXISTS public.profile_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, profile_id),
  CHECK (follower_id <> profile_id)
);

GRANT SELECT, INSERT, DELETE ON public.profile_follows TO authenticated;
GRANT ALL ON public.profile_follows TO service_role;

ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own follows"
  ON public.profile_follows FOR ALL
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users view follows of themselves"
  ON public.profile_follows FOR SELECT
  USING (auth.uid() = follower_id OR auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_follows_follower ON public.profile_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_profile_follows_profile ON public.profile_follows(profile_id);

-- follow_profile
CREATE OR REPLACE FUNCTION public.follow_profile(p_profile_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('error','Not authenticated'); END IF;
  IF v_uid = p_profile_id THEN RETURN json_build_object('error','Cannot follow yourself'); END IF;
  INSERT INTO public.profile_follows (follower_id, profile_id)
  VALUES (v_uid, p_profile_id)
  ON CONFLICT (follower_id, profile_id) DO NOTHING;
  RETURN json_build_object('success', true);
END; $$;

-- unfollow_profile
CREATE OR REPLACE FUNCTION public.unfollow_profile(p_profile_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN json_build_object('error','Not authenticated'); END IF;
  DELETE FROM public.profile_follows WHERE follower_id = v_uid AND profile_id = p_profile_id;
  RETURN json_build_object('success', true);
END; $$;

-- list_my_followed_profiles
CREATE OR REPLACE FUNCTION public.list_my_followed_profiles()
RETURNS TABLE (
  follow_id UUID,
  profile_id UUID,
  display_name TEXT,
  username TEXT,
  apelido TEXT,
  avatar_url TEXT,
  category TEXT,
  last_updated_at TIMESTAMPTZ,
  followed_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT pf.id, p.id, p.display_name, p.username, p.apelido, p.avatar_url,
         p.categoria_principal::TEXT, p.updated_at, pf.created_at
  FROM public.profile_follows pf
  JOIN public.profiles p ON p.id = pf.profile_id
  WHERE pf.follower_id = auth.uid()
  ORDER BY pf.created_at DESC;
END; $$;

-- get_profile_follow_status
CREATE OR REPLACE FUNCTION public.get_profile_follow_status(p_profile_id UUID)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN json_build_object('following', EXISTS (
    SELECT 1 FROM public.profile_follows
    WHERE follower_id = auth.uid() AND profile_id = p_profile_id
  ));
END; $$;

-- list_followed_profiles_feed (gallery photos dos perfis seguidos)
CREATE OR REPLACE FUNCTION public.list_followed_profiles_feed(p_limit INT DEFAULT 30)
RETURNS TABLE (
  id UUID,
  profile_id UUID,
  title TEXT,
  description TEXT,
  type TEXT,
  created_at TIMESTAMPTZ,
  profile_name TEXT,
  profile_avatar_url TEXT,
  profile_username TEXT,
  profile_apelido TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT gp.id, gp.profile_id,
         'Nova foto'::TEXT, gp.caption, 'photo'::TEXT, gp.created_at,
         p.display_name, p.avatar_url, p.username, p.apelido
  FROM public.gallery_photos gp
  JOIN public.profiles p ON p.id = gp.profile_id
  WHERE gp.profile_id IN (
    SELECT profile_id FROM public.profile_follows WHERE follower_id = auth.uid()
  )
  ORDER BY gp.created_at DESC
  LIMIT p_limit;
END; $$;

REVOKE EXECUTE ON FUNCTION public.follow_profile(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unfollow_profile(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_my_followed_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_profile_follow_status(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_followed_profiles_feed(INT) FROM anon;

NOTIFY pgrst, 'reload schema';
