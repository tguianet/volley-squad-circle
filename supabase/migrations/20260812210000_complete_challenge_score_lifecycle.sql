-- Completes the score lifecycle with a start-time guard and member notifications.

CREATE OR REPLACE FUNCTION public.challenge_has_started(
  p_scheduled_date date,
  p_scheduled_time time
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT p_scheduled_date IS NOT NULL
     AND p_scheduled_time IS NOT NULL
     AND (p_scheduled_date + p_scheduled_time) AT TIME ZONE 'America/Sao_Paulo' <= now();
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
  v_challenge public.challenges;
  v_result public.challenges;
BEGIN
  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = _challenge_id
  FOR UPDATE;

  IF v_challenge.id IS NULL THEN
    RAISE EXCEPTION 'Desafio não encontrado';
  END IF;
  IF NOT public.challenge_has_started(v_challenge.scheduled_date, v_challenge.scheduled_time) THEN
    RAISE EXCEPTION 'O placar só pode ser registrado após o início da partida';
  END IF;
  IF _score_challenger < 0
     OR _score_challenged < 0
     OR _score_challenger = _score_challenged THEN
    RAISE EXCEPTION 'Informe um placar válido e sem empate';
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

CREATE OR REPLACE FUNCTION public.notify_challenge_score_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_kind text;
  v_title text;
  v_body text;
BEGIN
  IF NEW.status = 'awaiting_confirmation'
     AND NEW.score_registered_at IS DISTINCT FROM OLD.score_registered_at THEN
    v_kind := 'score_pending';
    v_title := 'Placar aguardando confirmação';
    v_body := 'Placar informado: ' || NEW.score_challenger || ' x ' || NEW.score_challenged || '.';
  ELSIF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_kind := 'score_confirmed';
    v_title := 'Placar confirmado';
    v_body := 'Resultado final: ' || NEW.score_challenger || ' x ' || NEW.score_challenged || '.';
  ELSIF OLD.status = 'awaiting_confirmation' AND NEW.status = 'scheduled' THEN
    v_kind := 'score_rejected';
    v_title := 'Placar rejeitado';
    v_body := 'O placar foi rejeitado e deve ser registrado novamente.';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications(user_id, kind, title, body, link_url, created_by)
  SELECT DISTINCT tm.profile_id, v_kind, v_title, v_body, '/desafios', auth.uid()
  FROM public.team_members tm
  JOIN public.teams t ON t.id = tm.team_id
  WHERE tm.team_id IN (NEW.challenger_team_id, NEW.challenged_team_id)
    AND tm.profile_id <> t.captain_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_challenge_score_members ON public.challenges;
CREATE TRIGGER notify_challenge_score_members
AFTER UPDATE OF status, score_registered_at ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.notify_challenge_score_members();

REVOKE ALL ON FUNCTION public.challenge_has_started(date,time) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.challenge_has_started(date,time) TO authenticated;
REVOKE ALL ON FUNCTION public.notify_challenge_score_members() FROM PUBLIC, anon, authenticated;
