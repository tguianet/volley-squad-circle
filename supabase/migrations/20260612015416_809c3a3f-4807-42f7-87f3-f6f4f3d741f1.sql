
-- Default 0 points
ALTER TABLE public.teams ALTER COLUMN points SET DEFAULT 0;
UPDATE public.teams SET points = 0 WHERE wins = 0 AND losses = 0;

-- Recompute team gender from members' profile.genero
CREATE OR REPLACE FUNCTION public.recompute_team_gender(_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_m boolean;
  has_f boolean;
  new_gender team_gender;
BEGIN
  SELECT
    bool_or(p.genero = 'M'),
    bool_or(p.genero = 'F')
  INTO has_m, has_f
  FROM public.team_members tm
  JOIN public.profiles p ON p.id = tm.profile_id
  WHERE tm.team_id = _team_id;

  -- Include captain (in case not in team_members yet)
  SELECT
    COALESCE(has_m, false) OR bool_or(p.genero = 'M'),
    COALESCE(has_f, false) OR bool_or(p.genero = 'F')
  INTO has_m, has_f
  FROM public.teams t
  JOIN public.profiles p ON p.id = t.captain_id
  WHERE t.id = _team_id;

  IF has_m AND has_f THEN
    new_gender := 'X';
  ELSIF has_f THEN
    new_gender := 'F';
  ELSE
    new_gender := 'M';
  END IF;

  UPDATE public.teams SET gender = new_gender WHERE id = _team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_team_member_recompute_gender()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_team_gender(OLD.team_id);
    RETURN OLD;
  ELSE
    PERFORM public.recompute_team_gender(NEW.team_id);
    RETURN NEW;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS team_members_recompute_gender ON public.team_members;
CREATE TRIGGER team_members_recompute_gender
AFTER INSERT OR DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.tg_team_member_recompute_gender();

-- Backfill existing teams
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.teams LOOP
    PERFORM public.recompute_team_gender(r.id);
  END LOOP;
END $$;
