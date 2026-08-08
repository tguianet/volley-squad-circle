-- Make team creation atomic, protect ranking data and prevent full matches
-- from accepting extra players through direct API calls.

CREATE OR REPLACE FUNCTION public.create_team_with_invites(
  p_name text,
  p_category public.team_category,
  p_gender public.team_gender,
  p_invitee_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_required_invitees integer;
  v_valid_invitees integer;
  v_distinct_invitees integer;
  v_male_count integer;
  v_female_count integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para montar um time';
  END IF;

  IF length(btrim(p_name)) < 2 OR length(btrim(p_name)) > 60 THEN
    RAISE EXCEPTION 'O nome do time deve ter entre 2 e 60 caracteres';
  END IF;

  v_required_invitees := CASE WHEN p_category = 'quarteto' THEN 3 ELSE 1 END;
  IF COALESCE(array_length(p_invitee_ids, 1), 0) <> v_required_invitees THEN
    RAISE EXCEPTION 'Quantidade de participantes inválida para este formato';
  END IF;

  SELECT count(DISTINCT invitee_id)
  INTO v_distinct_invitees
  FROM unnest(p_invitee_ids) AS invitee_id;

  IF v_distinct_invitees <> v_required_invitees
     OR auth.uid() = ANY(p_invitee_ids) THEN
    RAISE EXCEPTION 'A lista de participantes contém jogadores inválidos ou repetidos';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE genero = 'M'),
         count(*) FILTER (WHERE genero = 'F')
  INTO v_valid_invitees, v_male_count, v_female_count
  FROM public.profiles
  WHERE id = ANY(p_invitee_ids)
    AND NOT COALESCE(is_suspended, false);

  IF v_valid_invitees <> v_required_invitees THEN
    RAISE EXCEPTION 'Um ou mais participantes não estão disponíveis';
  END IF;

  IF p_gender IN ('M', 'F') AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = ANY(p_invitee_ids) AND genero IS DISTINCT FROM p_gender::text
  ) THEN
    RAISE EXCEPTION 'Os participantes não correspondem ao formato selecionado';
  END IF;

  IF p_gender = 'X' THEN
    SELECT v_male_count + CASE WHEN genero = 'M' THEN 1 ELSE 0 END,
           v_female_count + CASE WHEN genero = 'F' THEN 1 ELSE 0 END
    INTO v_male_count, v_female_count
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_male_count = 0 OR v_female_count = 0 THEN
      RAISE EXCEPTION 'Times mistos precisam ter jogadores dos dois gêneros';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.teams
    WHERE captain_id = auth.uid()
      AND category = p_category
      AND gender = p_gender
      AND is_active
  ) THEN
    RAISE EXCEPTION 'Você já possui um time ativo neste formato';
  END IF;

  INSERT INTO public.teams (name, category, gender, captain_id)
  VALUES (btrim(p_name), p_category, p_gender, auth.uid())
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, profile_id)
  VALUES (v_team_id, auth.uid());

  INSERT INTO public.team_invitations (team_id, inviter_id, invitee_id)
  SELECT v_team_id, auth.uid(), invitee_id
  FROM unnest(p_invitee_ids) AS invitee_id;

  RETURN v_team_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_team_with_invites(text, public.team_category, public.team_gender, uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team_with_invites(text, public.team_category, public.team_gender, uuid[]) TO authenticated;

DROP POLICY IF EXISTS "Captain or admin manages members - insert" ON public.team_members;
CREATE POLICY "Admin manages members - insert"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.guard_team_competitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.points IS DISTINCT FROM OLD.points
    OR NEW.wins IS DISTINCT FROM OLD.wins
    OR NEW.losses IS DISTINCT FROM OLD.losses
    OR NEW.current_streak IS DISTINCT FROM OLD.current_streak
    OR NEW.rank_position IS DISTINCT FROM OLD.rank_position
  )
  AND NOT public.has_role(auth.uid(), 'admin')
  AND current_setting('app.challenge_score_authorized', true) IS DISTINCT FROM 'true'
  AND current_setting('app.score_transition_authorized', true) IS DISTINCT FROM 'true'
  THEN
    RAISE EXCEPTION 'Campos competitivos do time só podem ser alterados pelo sistema';
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name
     AND (length(btrim(NEW.name)) < 2 OR length(btrim(NEW.name)) > 60) THEN
    RAISE EXCEPTION 'O nome do time deve ter entre 2 e 60 caracteres';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_team_competitive_fields ON public.teams;
CREATE TRIGGER trg_guard_team_competitive_fields
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.guard_team_competitive_fields();

CREATE OR REPLACE FUNCTION public.guard_match_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
  v_confirmed_count integer;
BEGIN
  SELECT * INTO v_match
  FROM public.matches
  WHERE id = NEW.match_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada';
  END IF;

  IF NEW.status = 'confirmed'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'confirmed') THEN
    IF v_match.status NOT IN ('open', 'full') THEN
      RAISE EXCEPTION 'Esta partida não aceita novas inscrições';
    END IF;

    SELECT count(*) INTO v_confirmed_count
    FROM public.match_players
    WHERE match_id = NEW.match_id AND status = 'confirmed';

    IF v_confirmed_count >= v_match.max_players THEN
      RAISE EXCEPTION 'Esta partida já está lotada';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_match_capacity ON public.match_players;
CREATE TRIGGER trg_guard_match_capacity
  BEFORE INSERT OR UPDATE OF status ON public.match_players
  FOR EACH ROW EXECUTE FUNCTION public.guard_match_capacity();

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_max_players_check;
ALTER TABLE public.matches
  ADD CONSTRAINT matches_max_players_check CHECK (max_players BETWEEN 2 AND 12);
