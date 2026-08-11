-- Enforces the monthly Sunday schedule used by team challenges.

-- Normalize legacy rows written before the stricter rules. Nothing is deleted:
-- malformed available slots simply return to the safe "not configured" state.
UPDATE public.team_monthly_availability
SET month = date_trunc('month', sunday_date)::date;

UPDATE public.team_monthly_availability
SET is_available = false,
    time_start = NULL,
    time_end = NULL,
    arena_id = NULL,
    court_id = NULL
WHERE NOT is_available
   OR time_start IS NULL
   OR time_end IS NULL
   OR time_start >= time_end
   OR arena_id IS NULL;

ALTER TABLE public.team_monthly_availability
  DROP CONSTRAINT IF EXISTS team_monthly_availability_sunday_check;
ALTER TABLE public.team_monthly_availability
  ADD CONSTRAINT team_monthly_availability_sunday_check
  CHECK (extract(dow from sunday_date) = 0);

ALTER TABLE public.team_monthly_availability
  DROP CONSTRAINT IF EXISTS team_monthly_availability_month_check;
ALTER TABLE public.team_monthly_availability
  ADD CONSTRAINT team_monthly_availability_month_check
  CHECK (month = date_trunc('month', sunday_date)::date);

ALTER TABLE public.team_monthly_availability
  DROP CONSTRAINT IF EXISTS team_monthly_availability_fields_check;
ALTER TABLE public.team_monthly_availability
  ADD CONSTRAINT team_monthly_availability_fields_check CHECK (
    (NOT is_available AND time_start IS NULL AND time_end IS NULL AND arena_id IS NULL AND court_id IS NULL)
    OR
    (is_available AND time_start IS NOT NULL AND time_end IS NOT NULL AND time_start < time_end AND arena_id IS NOT NULL)
  );

CREATE OR REPLACE FUNCTION public.prepare_team_month_availability(
  p_team_id uuid,
  p_month date
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month date := date_trunc('month', p_month)::date;
  v_inserted integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para consultar a disponibilidade';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND profile_id = auth.uid()
  ) AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Você não participa desta equipe';
  END IF;
  IF v_month < date_trunc('month', current_date)::date THEN
    RAISE EXCEPTION 'Não é possível preparar disponibilidade de mês encerrado';
  END IF;

  INSERT INTO public.team_monthly_availability (team_id, month, sunday_date, is_available)
  SELECT p_team_id, v_month, sunday_date, false
  FROM public.get_sundays_of_month(v_month)
  ON CONFLICT (team_id, sunday_date) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.prepare_team_month_availability(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.prepare_team_month_availability(uuid, date) TO authenticated;

-- Internal generators need to produce constraint-valid empty rows.
CREATE OR REPLACE FUNCTION public.generate_month_availability(_month date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_month date := date_trunc('month', _month)::date;
BEGIN
  INSERT INTO public.team_monthly_availability (team_id, month, sunday_date, is_available)
  SELECT t.id, v_month, s.sunday_date, false
  FROM public.teams t
  CROSS JOIN public.get_sundays_of_month(v_month) s
  ON CONFLICT (team_id, sunday_date) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.generate_month_availability(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_month_availability(date) TO service_role;
