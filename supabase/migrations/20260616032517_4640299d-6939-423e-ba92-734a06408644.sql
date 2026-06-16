CREATE OR REPLACE FUNCTION public.list_my_followed_profiles()
RETURNS TABLE(
  follow_id uuid,
  profile_id uuid,
  display_name text,
  username text,
  apelido text,
  avatar_url text,
  category text,
  last_updated_at timestamp with time zone,
  followed_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    pf.id,
    p.id,
    p.display_name,
    p.username,
    p.apelido,
    p.avatar_url,
    p.level::text,
    p.updated_at,
    pf.created_at
  FROM public.profile_follows pf
  JOIN public.profiles p ON p.id = pf.profile_id
  WHERE pf.follower_id = auth.uid()
  ORDER BY pf.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_followed_profiles_feed(p_limit integer DEFAULT 30)
RETURNS TABLE(
  id uuid,
  profile_id uuid,
  title text,
  description text,
  type text,
  created_at timestamp with time zone,
  profile_name text,
  profile_avatar_url text,
  profile_username text,
  profile_apelido text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    gp.id,
    gp.user_id,
    'Nova foto'::text,
    gp.description,
    'photo'::text,
    gp.created_at,
    p.display_name,
    p.avatar_url,
    p.username,
    p.apelido
  FROM public.gallery_photos gp
  JOIN public.profiles p ON p.id = gp.user_id
  WHERE gp.user_id IN (
    SELECT pf.profile_id
    FROM public.profile_follows pf
    WHERE pf.follower_id = auth.uid()
  )
  ORDER BY gp.created_at DESC
  LIMIT p_limit;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.list_my_followed_profiles() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_followed_profiles_feed(integer) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_my_followed_profiles() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_followed_profiles_feed(integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';