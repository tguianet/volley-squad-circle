DROP FUNCTION IF EXISTS public.get_public_profile_by_username(text);

CREATE FUNCTION public.get_public_profile_by_username(p_username text)
RETURNS TABLE (
  id uuid,
  display_name text,
  username text,
  apelido text,
  bio text,
  city text,
  state text,
  instagram text,
  posicao_principal text,
  level text,
  mao_dominante text,
  altura numeric,
  avatar_url text,
  banner_url text,
  genero text,
  status text,
  pontos integer,
  vitorias integer,
  derrotas integer
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
    p.bio,
    p.city,
    p.state,
    p.instagram,
    p.posicao_principal,
    p.level::text,
    p.mao_dominante,
    p.altura,
    p.avatar_url,
    p.banner_url,
    p.genero::text,
    p.status::text,
    p.pontos,
    p.vitorias,
    p.derrotas
  FROM public.profiles p
  WHERE p.username = p_username OR p.apelido = p_username
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO service_role;

NOTIFY pgrst, 'reload schema';