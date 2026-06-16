CREATE OR REPLACE FUNCTION public.list_public_profile_follows(p_profile_id uuid, p_limit int DEFAULT 9)
RETURNS TABLE(profile_id uuid, display_name text, username text, apelido text, avatar_url text, category text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.display_name, p.username, p.apelido, p.avatar_url, p.level::text
  FROM public.profile_follows pf
  JOIN public.profiles p ON p.id = pf.profile_id
  WHERE pf.follower_id = p_profile_id
  ORDER BY pf.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.list_public_profile_updates(p_profile_id uuid, p_limit int DEFAULT 10)
RETURNS TABLE(id uuid, title text, description text, type text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gp.id, 'Nova foto'::text, gp.description, 'photo'::text, gp.created_at
  FROM public.gallery_photos gp
  WHERE gp.user_id = p_profile_id
  ORDER BY gp.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

CREATE OR REPLACE FUNCTION public.list_public_profile_gallery(p_profile_id uuid, p_limit int DEFAULT 9)
RETURNS TABLE(id uuid, image_url text, description text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT gp.id, gp.image_url, gp.description, gp.created_at
  FROM public.gallery_photos gp
  WHERE gp.user_id = p_profile_id
  ORDER BY gp.created_at DESC
  LIMIT GREATEST(p_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.list_public_profile_follows(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_public_profile_updates(uuid, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_public_profile_gallery(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_profile_follows(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profile_updates(uuid, int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profile_gallery(uuid, int) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';