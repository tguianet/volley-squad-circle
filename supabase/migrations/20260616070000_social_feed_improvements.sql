-- Posts de texto sem imagem + seguidores públicos + whatsapp no perfil público

ALTER TABLE public.gallery_photos
  ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE public.gallery_photos
  DROP CONSTRAINT IF EXISTS gallery_photos_content_check;

ALTER TABLE public.gallery_photos
  ADD CONSTRAINT gallery_photos_content_check
  CHECK (
    image_url IS NOT NULL
    OR (description IS NOT NULL AND length(trim(description)) > 0)
  );

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

REVOKE ALL ON FUNCTION public.list_public_profile_followers(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_profile_followers(uuid, int) TO anon, authenticated, service_role;

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
  whatsapp text,
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
DECLARE
  v_username text := lower(trim(p_username));
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
    p.whatsapp,
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
  WHERE lower(trim(p.username)) = v_username
     OR lower(trim(p.apelido)) = v_username
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_by_username(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
