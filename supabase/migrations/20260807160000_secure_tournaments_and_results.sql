-- Fecha bypasses restantes em torneios e resultados competitivos.

CREATE OR REPLACE FUNCTION public.is_active_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = p_user_id
      AND NOT COALESCE(is_suspended, false)
  );
$$;

REVOKE ALL ON FUNCTION public.is_active_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_for_tournament(p_tournament_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tournament public.tournaments%ROWTYPE;
  v_registration_id uuid;
  v_confirmed_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Faca login para se inscrever.';
  END IF;

  IF NOT public.is_active_profile(v_user_id) THEN
    RAISE EXCEPTION 'Conta suspensa nao pode se inscrever em torneios.';
  END IF;

  SELECT *
    INTO v_tournament
    FROM public.tournaments
   WHERE id = p_tournament_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Torneio nao encontrado.';
  END IF;

  IF v_tournament.status NOT IN ('open', 'featured', 'last_spots') THEN
    RAISE EXCEPTION 'As inscricoes deste torneio estao encerradas.';
  END IF;

  IF (v_tournament.event_date + v_tournament.start_time)
       AT TIME ZONE 'America/Sao_Paulo' <= now() THEN
    RAISE EXCEPTION 'Nao e possivel se inscrever depois do inicio do torneio.';
  END IF;

  SELECT id
    INTO v_registration_id
    FROM public.tournament_registrations
   WHERE tournament_id = p_tournament_id
     AND user_id = v_user_id
     AND status = 'confirmed';

  IF FOUND THEN
    RAISE EXCEPTION 'Voce ja esta inscrito neste torneio.';
  END IF;

  SELECT count(*)
    INTO v_confirmed_count
    FROM public.tournament_registrations
   WHERE tournament_id = p_tournament_id
     AND status = 'confirmed';

  IF v_confirmed_count >= v_tournament.max_teams THEN
    RAISE EXCEPTION 'O torneio ja atingiu o limite de inscritos.';
  END IF;

  INSERT INTO public.tournament_registrations (tournament_id, user_id, status)
  VALUES (p_tournament_id, v_user_id, 'confirmed')
  ON CONFLICT (tournament_id, user_id) DO UPDATE
    SET status = 'confirmed', registered_at = now()
  RETURNING id INTO v_registration_id;

  RETURN v_registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_for_tournament(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_tournament(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_tournament_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_confirmed_count integer;
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.category_label := btrim(NEW.category_label);

  IF NEW.title = '' OR length(NEW.title) > 120 THEN
    RAISE EXCEPTION 'Nome do torneio invalido';
  END IF;

  IF NEW.category_label = '' OR length(NEW.category_label) > 80 THEN
    RAISE EXCEPTION 'Categoria do torneio invalida';
  END IF;

  IF (TG_OP = 'INSERT' OR NEW.event_date IS DISTINCT FROM OLD.event_date)
     AND NEW.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'A data do torneio nao pode estar no passado';
  END IF;

  IF NEW.max_teams < 2 OR NEW.max_teams > 128 THEN
    RAISE EXCEPTION 'A quantidade de vagas deve ficar entre 2 e 128';
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.max_teams < OLD.max_teams THEN
    SELECT count(*)
      INTO v_confirmed_count
      FROM public.tournament_registrations
     WHERE tournament_id = OLD.id
       AND status = 'confirmed';

    IF NEW.max_teams < v_confirmed_count THEN
      RAISE EXCEPTION 'A quantidade de vagas nao pode ser menor que o total de inscritos';
    END IF;
  END IF;

  IF NEW.entry_fee_cents < 0 THEN
    RAISE EXCEPTION 'A taxa de inscricao nao pode ser negativa';
  END IF;

  IF NEW.image_url IS NOT NULL
     AND NEW.image_url !~* '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'A imagem precisa usar uma URL HTTPS valida';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'O criador do torneio nao pode ser alterado';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_challenge_score(
  _challenge_id uuid,
  _score_challenger integer,
  _score_challenged integer
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.challenges;
BEGIN
  IF NOT public.is_active_profile(auth.uid()) THEN
    RAISE EXCEPTION 'Conta suspensa nao pode registrar placar';
  END IF;

  IF _score_challenger < 0
     OR _score_challenged < 0
     OR _score_challenger = _score_challenged THEN
    RAISE EXCEPTION 'Informe um placar valido e sem empate';
  END IF;

  PERFORM set_config('app.challenge_score_authorized', 'true', true);
  SELECT * INTO v_result
  FROM public.register_challenge_score_internal(
    _challenge_id,
    _score_challenger,
    _score_challenged
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_challenge_score(_challenge_id uuid)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.challenges;
BEGIN
  IF NOT public.is_active_profile(auth.uid()) THEN
    RAISE EXCEPTION 'Conta suspensa nao pode confirmar placar';
  END IF;

  PERFORM set_config('app.challenge_score_authorized', 'true', true);
  SELECT * INTO v_result
  FROM public.confirm_challenge_score_internal(_challenge_id);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_challenge_score(_challenge_id uuid)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.challenges;
BEGIN
  IF NOT public.is_active_profile(auth.uid()) THEN
    RAISE EXCEPTION 'Conta suspensa nao pode rejeitar placar';
  END IF;

  PERFORM set_config('app.challenge_score_authorized', 'true', true);
  SELECT * INTO v_result
  FROM public.reject_challenge_score_internal(_challenge_id);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.register_challenge_score(uuid, integer, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_challenge_score(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_challenge_score(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_challenge_score(uuid, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_challenge_score(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_challenge_score(uuid)
  TO authenticated;
