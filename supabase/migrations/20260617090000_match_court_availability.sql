-- court_number em partidas amistosas + RPCs de disponibilidade guiada

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS court_number INT NOT NULL DEFAULT 1
    CHECK (court_number BETWEEN 1 AND 7);

CREATE INDEX IF NOT EXISTS idx_matches_court_slot
  ON public.matches (date, arena_id, court_number, start_time)
  WHERE status <> 'cancelled';

-- Fim efetivo de uma partida (padrão: 1 hora)
CREATE OR REPLACE FUNCTION public._match_effective_end(p_start TIME, p_end TIME)
RETURNS TIME
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_end, p_start + interval '1 hour')::time;
$$;

-- Conflito de quadra: partidas amistosas + desafios agendados
CREATE OR REPLACE FUNCTION public._has_court_conflict(
  p_match_date DATE,
  p_arena_id UUID,
  p_court_number INT,
  p_start_time TIME,
  p_end_time TIME
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_court_number IS NULL OR p_court_number < 1 OR p_court_number > 7 THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.date = p_match_date
      AND m.arena_id IS NOT DISTINCT FROM p_arena_id
      AND m.court_number = p_court_number
      AND m.status <> 'cancelled'
      AND p_start_time < public._match_effective_end(m.start_time, m.end_time)
      AND p_end_time > m.start_time
  ) THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.challenges ch
    JOIN public.courts c ON c.id = ch.court_id
    WHERE ch.scheduled_date = p_match_date
      AND ch.arena_id IS NOT DISTINCT FROM p_arena_id
      AND c.number = p_court_number
      AND ch.status IN ('pending', 'scheduled', 'awaiting_schedule', 'reschedule_requested')
      AND ch.scheduled_time IS NOT NULL
      AND p_start_time < (
        ch.scheduled_time + make_interval(mins => COALESCE(ch.duration_minutes, 60))
      )::time
      AND p_end_time > ch.scheduled_time
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- Próximos 8 domingos com ao menos um horário livre
CREATE OR REPLACE FUNCTION public.get_available_sundays(p_arena_id UUID)
RETURNS TABLE(match_date DATE, free_slots_count INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_first_sunday DATE;
BEGIN
  IF p_arena_id IS NULL THEN
    RETURN;
  END IF;

  v_first_sunday := CURRENT_DATE
    + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::int) % 7) * interval '1 day';

  RETURN QUERY
  WITH sundays AS (
    SELECT (v_first_sunday + (n * interval '7 days'))::date AS d
    FROM generate_series(0, 7) AS n
  ),
  slots AS (
    SELECT make_time(h, 0, 0) AS start_time, make_time(h + 1, 0, 0) AS end_time
    FROM generate_series(8, 16) AS h
  ),
  courts AS (
    SELECT generate_series(1, 7) AS court_number
  ),
  slot_availability AS (
    SELECT
      s.d AS match_date,
      sl.start_time,
      EXISTS (
        SELECT 1
        FROM courts c
        WHERE NOT public._has_court_conflict(
          s.d, p_arena_id, c.court_number, sl.start_time, sl.end_time
        )
      ) AS has_free_court
    FROM sundays s
    CROSS JOIN slots sl
  )
  SELECT
    sa.match_date,
    COUNT(*) FILTER (WHERE sa.has_free_court)::int AS free_slots_count
  FROM slot_availability sa
  GROUP BY sa.match_date
  HAVING COUNT(*) FILTER (WHERE sa.has_free_court) > 0
  ORDER BY sa.match_date;
END;
$function$;

-- Horários livres (08:00–17:00, slots de 1h)
CREATE OR REPLACE FUNCTION public.get_available_time_slots(
  p_match_date DATE,
  p_arena_id UUID
)
RETURNS TABLE(start_time TIME, end_time TIME, available_courts_count INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_arena_id IS NULL OR p_match_date IS NULL THEN
    RETURN;
  END IF;

  IF EXTRACT(DOW FROM p_match_date)::int <> 0 THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH slots AS (
    SELECT make_time(h, 0, 0) AS start_time, make_time(h + 1, 0, 0) AS end_time
    FROM generate_series(8, 16) AS h
  ),
  courts AS (
    SELECT generate_series(1, 7) AS court_number
  ),
  slot_counts AS (
    SELECT
      sl.start_time,
      sl.end_time,
      COUNT(*) FILTER (
        WHERE NOT public._has_court_conflict(
          p_match_date, p_arena_id, c.court_number, sl.start_time, sl.end_time
        )
      )::int AS available_courts_count
    FROM slots sl
    CROSS JOIN courts c
    GROUP BY sl.start_time, sl.end_time
  )
  SELECT sc.start_time, sc.end_time, sc.available_courts_count
  FROM slot_counts sc
  WHERE sc.available_courts_count > 0
  ORDER BY sc.start_time;
END;
$function$;

-- Quadras livres no domingo/horário
CREATE OR REPLACE FUNCTION public.get_available_courts(
  p_match_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_arena_id UUID
)
RETURNS TABLE(court_number INT, court_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_arena_id IS NULL OR p_match_date IS NULL OR p_start_time IS NULL OR p_end_time IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.number AS court_number,
    c.name AS court_name
  FROM public.courts c
  WHERE c.is_active
    AND c.number BETWEEN 1 AND 7
    AND NOT public._has_court_conflict(
      p_match_date, p_arena_id, c.number, p_start_time, p_end_time
    )
  ORDER BY c.number;
END;
$function$;

-- Verificação final antes de inserir
CREATE OR REPLACE FUNCTION public.check_court_availability(
  p_match_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_arena_id UUID,
  p_court_number INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_arena_id IS NULL
    OR p_match_date IS NULL
    OR p_start_time IS NULL
    OR p_end_time IS NULL
    OR p_court_number IS NULL
  THEN
    RETURN false;
  END IF;

  RETURN NOT public._has_court_conflict(
    p_match_date, p_arena_id, p_court_number, p_start_time, p_end_time
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_available_sundays(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_time_slots(DATE, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_courts(DATE, TIME, TIME, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_court_availability(DATE, TIME, TIME, UUID, INT) TO authenticated;
