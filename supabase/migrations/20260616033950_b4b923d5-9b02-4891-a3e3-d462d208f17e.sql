CREATE OR REPLACE FUNCTION public.list_scheduled_challenges_public()
RETURNS TABLE(
  id uuid,
  scheduled_date date,
  scheduled_time time,
  challenger_id uuid,
  challenger_name text,
  challenger_rank integer,
  challenged_id uuid,
  challenged_name text,
  challenged_rank integer,
  arena_id uuid,
  arena_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id, c.scheduled_date, c.scheduled_time,
    t1.id, t1.name, t1.rank_position,
    t2.id, t2.name, t2.rank_position,
    a.id, a.name
  FROM public.challenges c
  LEFT JOIN public.teams t1 ON t1.id = c.challenger_team_id
  LEFT JOIN public.teams t2 ON t2.id = c.challenged_team_id
  LEFT JOIN public.arenas a ON a.id = c.arena_id
  WHERE c.status = 'scheduled'
    AND c.scheduled_date >= CURRENT_DATE
  ORDER BY c.scheduled_date, c.scheduled_time
  LIMIT 20;
$$;

REVOKE ALL ON FUNCTION public.list_scheduled_challenges_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_scheduled_challenges_public() TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';