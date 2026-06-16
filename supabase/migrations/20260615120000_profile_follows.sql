-- =========================================================================
-- PROFILE FOLLOWS SYSTEM (Instagram-style)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profile_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_profile_follow UNIQUE (follower_id, following_profile_id),
  CHECK (follower_id <> following_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_follows_follower ON public.profile_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_profile_follows_following ON public.profile_follows(following_profile_id);

GRANT SELECT, INSERT, DELETE ON public.profile_follows TO authenticated;
GRANT ALL ON public.profile_follows TO service_role;

ALTER TABLE public.profile_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own follows"
  ON public.profile_follows FOR SELECT TO authenticated
  USING (follower_id = auth.uid());

CREATE POLICY "Users can follow profiles"
  ON public.profile_follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());

CREATE POLICY "Users can unfollow profiles"
  ON public.profile_follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- =========================================================================
-- PROFILE UPDATES (feed de alterações)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.profile_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profile_updates_profile ON public.profile_updates(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_updates_created ON public.profile_updates(created_at DESC);

GRANT SELECT ON public.profile_updates TO authenticated;
GRANT ALL ON public.profile_updates TO service_role;

ALTER TABLE public.profile_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read profile updates"
  ON public.profile_updates FOR SELECT TO authenticated
  USING (true);

-- Trigger: registrar alterações relevantes no perfil
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.bio IS DISTINCT FROM NEW.bio THEN
    INSERT INTO public.profile_updates (profile_id, title, description, type)
    VALUES (NEW.id, 'Bio atualizada', LEFT(COALESCE(NEW.bio, ''), 200), 'bio');
  END IF;

  IF OLD.avatar_url IS DISTINCT FROM NEW.avatar_url THEN
    INSERT INTO public.profile_updates (profile_id, title, description, type)
    VALUES (NEW.id, 'Foto de perfil alterada', NULL, 'avatar');
  END IF;

  IF OLD.banner_url IS DISTINCT FROM NEW.banner_url THEN
    INSERT INTO public.profile_updates (profile_id, title, description, type)
    VALUES (NEW.id, 'Banner atualizado', NULL, 'banner');
  END IF;

  IF OLD.level IS DISTINCT FROM NEW.level THEN
    INSERT INTO public.profile_updates (profile_id, title, description, type)
    VALUES (NEW.id, 'Nível atualizado', COALESCE(NEW.level, ''), 'level');
  END IF;

  IF OLD.posicao_principal IS DISTINCT FROM NEW.posicao_principal THEN
    INSERT INTO public.profile_updates (profile_id, title, description, type)
    VALUES (NEW.id, 'Posição atualizada', COALESCE(NEW.posicao_principal, ''), 'position');
  END IF;

  IF OLD.city IS DISTINCT FROM NEW.city OR OLD.state IS DISTINCT FROM NEW.state THEN
    INSERT INTO public.profile_updates (profile_id, title, description, type)
    VALUES (
      NEW.id,
      'Localização atualizada',
      TRIM(BOTH ', ' FROM CONCAT(COALESCE(NEW.city, ''), ', ', COALESCE(NEW.state, ''))),
      'location'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_profile_update ON public.profiles;
CREATE TRIGGER trg_log_profile_update
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_update();

-- =========================================================================
-- RPC FUNCTIONS
-- =========================================================================

CREATE OR REPLACE FUNCTION public.follow_profile(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_id UUID := auth.uid();
  v_new_id UUID;
BEGIN
  IF v_follower_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  IF v_follower_id = p_profile_id THEN
    RETURN json_build_object('error', 'Cannot follow yourself');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id) THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profile_follows
    WHERE follower_id = v_follower_id AND following_profile_id = p_profile_id
  ) THEN
    RETURN json_build_object('error', 'Already following this profile');
  END IF;

  INSERT INTO public.profile_follows (follower_id, following_profile_id)
  VALUES (v_follower_id, p_profile_id)
  RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'id', v_new_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_profile(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_id UUID := auth.uid();
BEGIN
  IF v_follower_id IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  DELETE FROM public.profile_follows
  WHERE follower_id = v_follower_id AND following_profile_id = p_profile_id;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Not following this profile');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

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
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pf.id AS follow_id,
    p.id AS profile_id,
    p.display_name,
    p.username,
    p.apelido,
    p.avatar_url,
    COALESCE(p.level, p.posicao_principal) AS category,
    p.updated_at AS last_updated_at,
    pf.created_at AS followed_at
  FROM public.profile_follows pf
  JOIN public.profiles p ON p.id = pf.following_profile_id
  WHERE pf.follower_id = auth.uid()
  ORDER BY pf.created_at DESC;
END;
$$;

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
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pu.id,
    pu.profile_id,
    pu.title,
    pu.description,
    pu.type,
    pu.created_at,
    p.display_name AS profile_name,
    p.avatar_url AS profile_avatar_url,
    p.username AS profile_username,
    p.apelido AS profile_apelido
  FROM public.profile_updates pu
  JOIN public.profiles p ON p.id = pu.profile_id
  WHERE pu.profile_id IN (
    SELECT following_profile_id
    FROM public.profile_follows
    WHERE follower_id = auth.uid()
  )
  ORDER BY pu.created_at DESC
  LIMIT p_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_follow_status(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_follower_id UUID := auth.uid();
  v_following BOOLEAN;
BEGIN
  IF v_follower_id IS NULL THEN
    RETURN json_build_object('following', false);
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.profile_follows
    WHERE follower_id = v_follower_id AND following_profile_id = p_profile_id
  ) INTO v_following;

  RETURN json_build_object('following', v_following);
END;
$$;

GRANT EXECUTE ON FUNCTION public.follow_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unfollow_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_followed_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_followed_profiles_feed(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_follow_status(UUID) TO authenticated;
