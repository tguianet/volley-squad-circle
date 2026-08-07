-- Isola reservas por arena e rejeita intervalos de horário inválidos.

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
  v_arena_id uuid;
  v_court_number integer;
BEGIN
  IF TG_TABLE_NAME = 'matches' THEN
    IF NEW.status NOT IN ('open', 'full') THEN RETURN NEW; END IF;
    v_date := NEW.date;
    v_start := NEW.start_time;
    v_end := COALESCE(NEW.end_time, NEW.start_time + interval '1 hour');
    v_arena_id := NEW.arena_id;
    v_court_number := NEW.court_number;
  ELSE
    IF NEW.status <> 'scheduled' THEN RETURN NEW; END IF;
    SELECT arena_id, number
      INTO v_arena_id, v_court_number
      FROM public.courts
     WHERE id = NEW.court_id
       AND is_active;
    v_date := NEW.scheduled_date;
    v_start := NEW.scheduled_time;
    v_end := NEW.scheduled_time
      + make_interval(mins => COALESCE(NEW.duration_minutes, 60));
  END IF;

  IF v_date IS NULL OR v_start IS NULL OR v_arena_id IS NULL OR v_court_number IS NULL THEN
    RAISE EXCEPTION 'Reserva sem data, horário, arena ou quadra válida';
  END IF;

  IF v_end <= v_start THEN
    RAISE EXCEPTION 'O horário final deve ser posterior ao horário inicial';
  END IF;

  -- Serializa apenas reservas da mesma quadra física.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(v_arena_id::text || ':' || v_date::text || ':' || v_court_number::text, 0)
  );

  IF EXISTS (
    SELECT 1
      FROM public.matches m
     WHERE m.date = v_date
       AND m.arena_id = v_arena_id
       AND m.court_number = v_court_number
       AND m.status IN ('open', 'full')
       AND (TG_TABLE_NAME <> 'matches' OR m.id <> NEW.id)
       AND tsrange(
             v_date + m.start_time,
             v_date + COALESCE(m.end_time, m.start_time + interval '1 hour'),
             '[)'
           ) && tsrange(v_date + v_start, v_date + v_end, '[)')
  ) OR EXISTS (
    SELECT 1
      FROM public.challenges ch
      JOIN public.courts c ON c.id = ch.court_id
     WHERE ch.scheduled_date = v_date
       AND c.arena_id = v_arena_id
       AND c.number = v_court_number
       AND ch.status = 'scheduled'
       AND (TG_TABLE_NAME <> 'challenges' OR ch.id <> NEW.id)
       AND tsrange(
             v_date + ch.scheduled_time,
             v_date + ch.scheduled_time
               + make_interval(mins => COALESCE(ch.duration_minutes, 60)),
             '[)'
           ) && tsrange(v_date + v_start, v_date + v_end, '[)')
  ) THEN
    RAISE EXCEPTION USING ERRCODE = '23P01', MESSAGE = 'Quadra já reservada nesse horário';
  END IF;

  RETURN NEW;
END;
$$;
