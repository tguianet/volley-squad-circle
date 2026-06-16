-- Adiciona contagem de conexões em comum (perfis que ambos seguem)
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
  followed_at timestamp with time zone,
  mutual_connections_count integer
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
    COALESCE(p.level, p.posicao_principal)::text,
    p.updated_at,
    pf.created_at,
    (
      SELECT COUNT(*)::int
      FROM public.profile_follows pf_me
      INNER JOIN public.profile_follows pf_other
        ON pf_other.profile_id = pf_me.profile_id
      WHERE pf_me.follower_id = auth.uid()
        AND pf_other.follower_id = p.id
        AND pf_me.profile_id <> p.id
    ) AS mutual_connections_count
  FROM public.profile_follows pf
  JOIN public.profiles p ON p.id = pf.profile_id
  WHERE pf.follower_id = auth.uid()
  ORDER BY pf.created_at DESC;
END;
$function$;

NOTIFY pgrst, 'reload schema';
