-- Impede W.O. antes do horário agendado e protege o estado após a penalidade.

CREATE OR REPLACE FUNCTION public.guard_walkover_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND (NEW.status = 'wo' OR OLD.status = 'wo')
     AND current_setting('app.walkover_authorized', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Use a operação segura para alterar um W.O.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.report_challenge_walkover(p_challenge_id uuid)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge public.challenges;
  v_scheduled_at timestamptz;
BEGIN
  SELECT *
    INTO v_challenge
    FROM public.challenges
   WHERE id = p_challenge_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Desafio não encontrado';
  END IF;

  IF v_challenge.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Somente desafio agendado pode receber W.O.';
  END IF;

  IF v_challenge.scheduled_date IS NULL OR v_challenge.scheduled_time IS NULL THEN
    RAISE EXCEPTION 'Desafio sem data ou horário válido.';
  END IF;

  v_scheduled_at :=
    (v_challenge.scheduled_date + v_challenge.scheduled_time)
    AT TIME ZONE 'America/Sao_Paulo';

  IF now() < v_scheduled_at THEN
    RAISE EXCEPTION 'O W.O. só pode ser registrado após o horário da partida.';
  END IF;

  -- Pela regra atual, W.O. é aplicado ao time desafiado e somente o adversário/admin registra.
  IF NOT (
    public.is_team_captain(auth.uid(), v_challenge.challenger_team_id)
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Apenas o capitão adversário ou administrador pode registrar este W.O.';
  END IF;

  PERFORM set_config('app.walkover_authorized', 'true', true);

  UPDATE public.challenges
     SET status = 'wo'
   WHERE id = p_challenge_id
     AND status = 'scheduled'
  RETURNING * INTO v_challenge;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'O desafio não está mais disponível para W.O.';
  END IF;

  RETURN v_challenge;
END;
$$;

REVOKE ALL ON FUNCTION public.report_challenge_walkover(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_challenge_walkover(uuid) TO authenticated;
