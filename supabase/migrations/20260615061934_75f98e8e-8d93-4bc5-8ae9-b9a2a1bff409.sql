DROP FUNCTION public.search_profiles(text, uuid);
CREATE OR REPLACE FUNCTION public.search_profiles(search_term text, exclude_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, display_name text, username text, apelido text, whatsapp text, avatar_url text, city text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT p.id, p.display_name, p.username, p.apelido, p.whatsapp, p.avatar_url, p.city
  FROM public.profiles p
  WHERE (exclude_id IS NULL OR p.id <> exclude_id)
    AND (p.display_name ILIKE ('%' || search_term || '%')
      OR p.username ILIKE ('%' || search_term || '%')
      OR p.apelido ILIKE ('%' || search_term || '%')
      OR p.whatsapp ILIKE ('%' || search_term || '%'))
    AND p.status = 'completo'
  ORDER BY p.display_name LIMIT 20;
END; $function$;
REVOKE EXECUTE ON FUNCTION public.search_profiles(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, uuid) TO authenticated;