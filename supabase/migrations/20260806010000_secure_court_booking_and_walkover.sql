-- Reserva de quadra atômica e registro seguro de W.O.

CREATE OR REPLACE FUNCTION public.guard_court_booking_conflict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date date;
  v_start time;
  v_end time;
  v_court_number integer;
BEGIN
  IF TG_TABLE_NAME = 'matches' THEN
    IF NEW.status NOT IN ('open', 'full') THEN RETURN NEW; END IF;
    v_date := NEW.date;
    v_start := NEW.start_time;
    v_end := COALESCE(NEW.end_time, NEW.start_time + interval '1 hour');
    v_court_number := NEW.court_number;
  ELSE
    IF NEW.status <> 'scheduled' THEN RETURN NEW; END IF;
    SELECT number INTO v_court_number FROM public.courts WHERE id = NEW.court_id;
    v_date := NEW.scheduled_date;
    v_start := NEW.scheduled_time;
    v_end := NEW.scheduled_time + (COALESCE(NEW.duration_minutes, 60) || ' minutes')::interval;
  END IF;

  IF v_date IS NULL OR v_start IS NULL OR v_court_number IS NULL THEN RETURN NEW; END IF;

  -- Todas as reservas da mesma quadra/data passam pela mesma transação serializada.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_date::text || ':' || v_court_number::text, 0));

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.date = v_date AND m.court_number = v_court_number
      AND m.status IN ('open', 'full')
      AND (TG_TABLE_NAME <> 'matches' OR m.id <> NEW.id)
      AND tsrange(v_date + m.start_time, v_date + COALESCE(m.end_time, m.start_time + interval '1 hour'), '[)')
          && tsrange(v_date + v_start, v_date + v_end, '[)')
  ) OR EXISTS (
    SELECT 1 FROM public.challenges ch
    JOIN public.courts c ON c.id = ch.court_id
    WHERE ch.scheduled_date = v_date AND c.number = v_court_number
      AND ch.status = 'scheduled'
      AND (TG_TABLE_NAME <> 'challenges' OR ch.id <> NEW.id)
      AND tsrange(v_date + ch.scheduled_time,
                  v_date + ch.scheduled_time + (COALESCE(ch.duration_minutes, 60) || ' minutes')::interval, '[)')
          && tsrange(v_date + v_start, v_date + v_end, '[)')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23P01', MESSAGE = 'Quadra já reservada nesse horário';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_match_court_booking ON public.matches;
CREATE TRIGGER trg_guard_match_court_booking
  BEFORE INSERT OR UPDATE OF date, start_time, end_time, court_number, status ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.guard_court_booking_conflict();

DROP TRIGGER IF EXISTS trg_guard_challenge_court_booking ON public.challenges;
CREATE TRIGGER trg_guard_challenge_court_booking
  BEFORE INSERT OR UPDATE OF scheduled_date, scheduled_time, court_id, duration_minutes, status ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.guard_court_booking_conflict();

CREATE OR REPLACE FUNCTION public.guard_walkover_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'wo' AND OLD.status IS DISTINCT FROM 'wo'
     AND current_setting('app.walkover_authorized', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Use a operação segura para registrar W.O.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_walkover_transition ON public.challenges;
CREATE TRIGGER trg_guard_walkover_transition
  BEFORE UPDATE OF status ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.guard_walkover_transition();

CREATE OR REPLACE FUNCTION public.report_challenge_walkover(p_challenge_id uuid)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge public.challenges;
BEGIN
  SELECT * INTO v_challenge FROM public.challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_challenge.status <> 'scheduled' THEN RAISE EXCEPTION 'Somente desafio agendado pode receber W.O.'; END IF;

  -- Pela regra atual, W.O. é aplicado ao time desafiado e somente o adversário/admin registra.
  IF NOT (public.is_team_captain(auth.uid(), v_challenge.challenger_team_id)
          OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Apenas o capitão adversário ou administrador pode registrar este W.O.';
  END IF;

  PERFORM set_config('app.walkover_authorized', 'true', true);
  UPDATE public.challenges SET status = 'wo' WHERE id = p_challenge_id RETURNING * INTO v_challenge;
  RETURN v_challenge;
END;
$$;

REVOKE ALL ON FUNCTION public.report_challenge_walkover(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_challenge_walkover(uuid) TO authenticated;
