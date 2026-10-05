-- Production audit fixes: atomic team creation, scalable broadcasts and safe public profile lookup.

CREATE OR REPLACE FUNCTION public.create_team_safely(
  p_name text,
  p_category public.team_category,
  p_gender public.team_gender,
  p_preferred_arena_id uuid,
  p_invitee_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_capacity integer;
  v_invitee_count integer;
  v_distinct_count integer;
  v_male_count integer;
  v_female_count integer;
  v_captain_gender text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para montar uma equipe';
  END IF;

  IF length(btrim(p_name)) < 2 OR length(btrim(p_name)) > 80 THEN
    RAISE EXCEPTION 'O nome da equipe deve ter entre 2 e 80 caracteres';
  END IF;

  v_capacity := CASE WHEN p_category = 'quarteto' THEN 4 ELSE 2 END;
  v_invitee_count := COALESCE(array_length(p_invitee_ids, 1), 0);

  IF v_invitee_count < 1 OR v_invitee_count > v_capacity - 1 THEN
    RAISE EXCEPTION 'Quantidade de jogadores convidados inválida para este formato';
  END IF;

  SELECT count(DISTINCT invitee_id)
  INTO v_distinct_count
  FROM unnest(p_invitee_ids) AS invitee_id;

  IF v_distinct_count <> v_invitee_count OR auth.uid() = ANY(p_invitee_ids) THEN
    RAISE EXCEPTION 'A lista de jogadores contém perfis repetidos ou inválidos';
  END IF;

  SELECT genero
  INTO v_captain_gender
  FROM public.profiles
  WHERE id = auth.uid()
    AND NOT COALESCE(is_suspended, false);

  IF v_captain_gender IS NULL THEN
    RAISE EXCEPTION 'Complete o gênero do seu perfil antes de montar uma equipe';
  END IF;

  IF (
    SELECT count(*)
    FROM public.profiles
    WHERE id = ANY(p_invitee_ids)
      AND NOT COALESCE(is_suspended, false)
  ) <> v_invitee_count THEN
    RAISE EXCEPTION 'Um ou mais jogadores convidados não estão disponíveis';
  END IF;

  IF p_gender IN ('M', 'F') THEN
    IF v_captain_gender <> p_gender::text OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = ANY(p_invitee_ids)
        AND genero IS DISTINCT FROM p_gender::text
    ) THEN
      RAISE EXCEPTION 'Os jogadores não correspondem ao formato escolhido';
    END IF;
  ELSE
    SELECT
      (CASE WHEN v_captain_gender = 'M' THEN 1 ELSE 0 END)
        + count(*) FILTER (WHERE genero = 'M'),
      (CASE WHEN v_captain_gender = 'F' THEN 1 ELSE 0 END)
        + count(*) FILTER (WHERE genero = 'F')
    INTO v_male_count, v_female_count
    FROM public.profiles
    WHERE id = ANY(p_invitee_ids);

    IF v_male_count = 0 OR v_female_count = 0 THEN
      RAISE EXCEPTION 'Equipes mistas precisam ter jogadores dos dois gêneros';
    END IF;
  END IF;

  IF p_preferred_arena_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.arenas WHERE id = p_preferred_arena_id AND is_active
  ) THEN
    RAISE EXCEPTION 'Arena preferida inválida ou inativa';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.teams
    WHERE captain_id = auth.uid()
      AND category = p_category
      AND gender = p_gender
      AND is_active
  ) THEN
    RAISE EXCEPTION 'Você já possui uma equipe ativa neste formato';
  END IF;

  INSERT INTO public.teams (
    name, category, gender, captain_id, preferred_arena_id, is_active
  )
  VALUES (
    btrim(p_name), p_category, p_gender, auth.uid(), p_preferred_arena_id, false
  )
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, profile_id)
  VALUES (v_team_id, auth.uid());

  INSERT INTO public.team_invitations (team_id, inviter_id, invitee_id)
  SELECT v_team_id, auth.uid(), invitee_id
  FROM unnest(p_invitee_ids) AS invitee_id;

  RETURN v_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_safely(
  text, public.team_category, public.team_gender, uuid, uuid[]
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_team_safely(
  text, public.team_category, public.team_gender, uuid, uuid[]
) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  p_title text,
  p_body text,
  p_link_url text,
  p_city text
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  INSERT INTO public.notifications (
    user_id, title, body, link_url, kind, created_by
  )
  SELECT
    p.id,
    p_title,
    NULLIF(p_body, ''),
    NULLIF(p_link_url, ''),
    'broadcast',
    auth.uid()
  FROM public.profiles p
  WHERE p_city IS NULL OR p.city = p_city;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_broadcast_notification(text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(text, text, text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile_by_id(p_profile_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT to_jsonb(x)
  FROM (
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
      p.level,
      p.mao_dominante,
      p.altura,
      p.avatar_url,
      p.banner_url,
      p.genero,
      p.status,
      p.pontos,
      p.vitorias,
      p.derrotas
    FROM public.profiles p
    WHERE p.id = p_profile_id
      AND NOT COALESCE(p.is_suspended, false)
    LIMIT 1
  ) x;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile_by_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_id(uuid) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
