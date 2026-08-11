-- Restaura EXECUTE em list_public_profile_followers omitido em 20260805223903 (phase 2 grants).
-- Leitura publica de seguidores; mesma politica de list_public_profile_follows.

REVOKE ALL ON FUNCTION public.list_public_profile_followers(uuid, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.list_public_profile_followers(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.list_public_profile_followers(uuid, integer) FROM authenticated;

GRANT EXECUTE ON FUNCTION public.list_public_profile_followers(uuid, integer) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
