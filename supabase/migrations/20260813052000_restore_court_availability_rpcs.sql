-- Restaura as RPCs de disponibilidade de quadras consumidas pelo fluxo de desafios.

CREATE OR REPLACE FUNCTION public._match_effective_end(p_start TIME, p_end TIME)
RETURNS TIME
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $function$
  SELECT COALESCE(p_end, p_start + interval '1 hour')::time;
$function$;

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
  SELECT c.number, c.name
  FROM public.courts c
  WHERE c.is_active
    AND c.number BETWEEN 1 AND 7
    AND NOT public._has_court_conflict(
      p_match_date,
      p_arena_id,
      c.number,
      p_start_time,
      p_end_time
    )
  ORDER BY c.number;
END;
$function$;

REVOKE ALL ON FUNCTION public._match_effective_end(TIME, TIME) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_available_courts(DATE, TIME, TIME, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._match_effective_end(TIME, TIME) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_available_courts(DATE, TIME, TIME, UUID) TO authenticated;
