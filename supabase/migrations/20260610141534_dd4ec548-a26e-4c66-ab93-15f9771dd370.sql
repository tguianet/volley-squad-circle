
-- =========================================================================
-- ENUMS
-- =========================================================================
DO $$ BEGIN
  CREATE TYPE public.team_category AS ENUM ('dupla', 'quarteto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.team_gender AS ENUM ('M', 'F', 'X');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.challenge_status AS ENUM (
    'pending', 'scheduled', 'reschedule_requested', 'declined', 'completed', 'wo'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.penalty_reason AS ENUM ('no_challenge_month', 'declined', 'walkover');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Ensure app_role has 'player' (already created previously in app)
-- (No-op if already there)

-- =========================================================================
-- ARENAS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.arenas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  cover_url TEXT,
  rating NUMERIC(3,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.arenas TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.arenas TO authenticated;
GRANT ALL ON public.arenas TO service_role;

ALTER TABLE public.arenas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Arenas viewable by everyone"
  ON public.arenas FOR SELECT
  USING (true);

CREATE POLICY "Admins manage arenas - insert"
  ON public.arenas FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage arenas - update"
  ON public.arenas FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage arenas - delete"
  ON public.arenas FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_arenas_updated_at
  BEFORE UPDATE ON public.arenas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TEAMS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category public.team_category NOT NULL,
  gender public.team_gender NOT NULL DEFAULT 'M',
  captain_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  preferred_arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
  rank_position INT,
  points INT NOT NULL DEFAULT 1000,
  wins INT NOT NULL DEFAULT 0,
  losses INT NOT NULL DEFAULT 0,
  current_streak INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.teams TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teams viewable by everyone"
  ON public.teams FOR SELECT USING (true);

CREATE POLICY "Authenticated can create team as captain"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (captain_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Captain or admin can update team"
  ON public.teams FOR UPDATE TO authenticated
  USING (captain_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (captain_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete team"
  ON public.teams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- TEAM MEMBERS
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, profile_id)
);

GRANT SELECT ON public.team_members TO authenticated, anon;
GRANT INSERT, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- helper function (security definer) avoids recursion
CREATE OR REPLACE FUNCTION public.is_team_captain(_user_id UUID, _team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.teams WHERE id = _team_id AND captain_id = _user_id
  )
$$;

CREATE POLICY "Members viewable by everyone"
  ON public.team_members FOR SELECT USING (true);

CREATE POLICY "Captain or admin manages members - insert"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.is_team_captain(auth.uid(), team_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Captain or admin manages members - delete"
  ON public.team_members FOR DELETE TO authenticated
  USING (public.is_team_captain(auth.uid(), team_id) OR public.has_role(auth.uid(), 'admin'));

-- =========================================================================
-- AVAILABILITY HELPERS
-- =========================================================================
CREATE OR REPLACE FUNCTION public.get_sundays_of_month(_month DATE)
RETURNS TABLE(sunday_date DATE)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  WITH first_day AS (
    SELECT date_trunc('month', _month)::DATE AS d
  ),
  last_day AS (
    SELECT (date_trunc('month', _month) + INTERVAL '1 month - 1 day')::DATE AS d
  )
  SELECT gs::DATE
  FROM first_day fd, last_day ld,
       generate_series(fd.d, ld.d, INTERVAL '1 day') gs
  WHERE EXTRACT(DOW FROM gs) = 0
$$;

-- =========================================================================
-- TEAM MONTHLY AVAILABILITY
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.team_monthly_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  sunday_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT false,
  time_start TIME,
  time_end TIME,
  arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, sunday_date)
);

CREATE INDEX IF NOT EXISTS idx_tma_team_month
  ON public.team_monthly_availability(team_id, month);
CREATE INDEX IF NOT EXISTS idx_tma_sunday
  ON public.team_monthly_availability(sunday_date);

GRANT SELECT ON public.team_monthly_availability TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.team_monthly_availability TO authenticated;
GRANT ALL ON public.team_monthly_availability TO service_role;

ALTER TABLE public.team_monthly_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Availability viewable by everyone"
  ON public.team_monthly_availability FOR SELECT USING (true);

CREATE POLICY "Captain or admin manages availability - insert"
  ON public.team_monthly_availability FOR INSERT TO authenticated
  WITH CHECK (public.is_team_captain(auth.uid(), team_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Captain or admin manages availability - update"
  ON public.team_monthly_availability FOR UPDATE TO authenticated
  USING (public.is_team_captain(auth.uid(), team_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.is_team_captain(auth.uid(), team_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Captain or admin manages availability - delete"
  ON public.team_monthly_availability FOR DELETE TO authenticated
  USING (public.is_team_captain(auth.uid(), team_id) OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_tma_updated_at
  BEFORE UPDATE ON public.team_monthly_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- CHALLENGES
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  challenged_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
  status public.challenge_status NOT NULL DEFAULT 'pending',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  responded_at TIMESTAMPTZ,
  reschedule_reason TEXT,
  winner_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  loser_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (challenger_team_id <> challenged_team_id)
);

CREATE INDEX IF NOT EXISTS idx_challenges_challenger ON public.challenges(challenger_team_id);
CREATE INDEX IF NOT EXISTS idx_challenges_challenged ON public.challenges(challenged_team_id);
CREATE INDEX IF NOT EXISTS idx_challenges_date ON public.challenges(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_challenges_status ON public.challenges(status);

GRANT SELECT ON public.challenges TO authenticated, anon;
GRANT INSERT, UPDATE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Challenges viewable by everyone"
  ON public.challenges FOR SELECT USING (true);

CREATE POLICY "Challenger captain creates challenge"
  ON public.challenges FOR INSERT TO authenticated
  WITH CHECK (
    public.is_team_captain(auth.uid(), challenger_team_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Involved captains or admin update challenge"
  ON public.challenges FOR UPDATE TO authenticated
  USING (
    public.is_team_captain(auth.uid(), challenger_team_id)
    OR public.is_team_captain(auth.uid(), challenged_team_id)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.is_team_captain(auth.uid(), challenger_team_id)
    OR public.is_team_captain(auth.uid(), challenged_team_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER trg_challenges_updated_at
  BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- MONTHLY PENALTIES (idempotent log)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.monthly_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  reason public.penalty_reason NOT NULL,
  points INT NOT NULL,
  challenge_id UUID REFERENCES public.challenges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, month, reason, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_mp_team_month ON public.monthly_penalties(team_id, month);

GRANT SELECT ON public.monthly_penalties TO authenticated;
GRANT ALL ON public.monthly_penalties TO service_role;

ALTER TABLE public.monthly_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Penalties viewable by authenticated"
  ON public.monthly_penalties FOR SELECT TO authenticated
  USING (true);

-- =========================================================================
-- CHALLENGE STATUS TRIGGER: penalties + win/loss
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_challenge_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
BEGIN
  -- Only react when status actually changes
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_month := date_trunc('month', NEW.scheduled_date)::DATE;

  IF NEW.status = 'declined' THEN
    -- Recusa: -30 ao time desafiado (que recusou)
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'declined', -30, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;

    UPDATE public.teams SET points = points - 30 WHERE id = NEW.challenged_team_id;
    NEW.responded_at := COALESCE(NEW.responded_at, now());

  ELSIF NEW.status = 'wo' THEN
    -- W.O.: assume challenged team faltou; aplica -50 nele
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'walkover', -50, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;

    UPDATE public.teams SET points = points - 50 WHERE id = NEW.challenged_team_id;

  ELSIF NEW.status = 'completed' THEN
    IF NEW.winner_team_id IS NOT NULL AND NEW.loser_team_id IS NOT NULL THEN
      UPDATE public.teams SET wins = wins + 1, current_streak = current_streak + 1
        WHERE id = NEW.winner_team_id;
      UPDATE public.teams SET losses = losses + 1, current_streak = 0
        WHERE id = NEW.loser_team_id;
    END IF;
  ELSIF NEW.status = 'scheduled' THEN
    NEW.responded_at := COALESCE(NEW.responded_at, now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_challenges_status ON public.challenges;
CREATE TRIGGER trg_challenges_status
  BEFORE INSERT OR UPDATE OF status ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.handle_challenge_status_change();

-- =========================================================================
-- AUTOMATIC AVAILABILITY GENERATION
-- =========================================================================
CREATE OR REPLACE FUNCTION public.generate_month_availability(_month DATE)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
BEGIN
  INSERT INTO public.team_monthly_availability (team_id, month, sunday_date, is_available)
  SELECT t.id, date_trunc('month', _month)::DATE, s.sunday_date, false
  FROM public.teams t
  CROSS JOIN public.get_sundays_of_month(_month) s
  WHERE t.is_active = true
  ON CONFLICT (team_id, sunday_date) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_current_month_availability()
RETURNS INT
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.generate_month_availability(date_trunc('month', now())::DATE)
$$;

-- =========================================================================
-- MONTHLY PENALTY JOB (-20 sem desafio)
-- =========================================================================
CREATE OR REPLACE FUNCTION public.apply_monthly_penalties(_month DATE)
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_team RECORD;
  v_first DATE := date_trunc('month', _month)::DATE;
  v_last DATE := (date_trunc('month', _month) + INTERVAL '1 month - 1 day')::DATE;
BEGIN
  FOR v_team IN
    SELECT t.id
    FROM public.teams t
    WHERE t.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE (c.challenger_team_id = t.id OR c.challenged_team_id = t.id)
          AND c.scheduled_date BETWEEN v_first AND v_last
          AND c.status IN ('scheduled', 'completed')
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.monthly_penalties mp
        WHERE mp.team_id = t.id AND mp.month = v_first AND mp.reason = 'no_challenge_month'
      )
  LOOP
    INSERT INTO public.monthly_penalties (team_id, month, reason, points)
    VALUES (v_team.id, v_first, 'no_challenge_month', -20);
    UPDATE public.teams SET points = points - 20 WHERE id = v_team.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_previous_month_penalties()
RETURNS INT
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.apply_monthly_penalties((date_trunc('month', now()) - INTERVAL '1 month')::DATE)
$$;

-- Allow service_role to call helpers
GRANT EXECUTE ON FUNCTION public.get_sundays_of_month(DATE) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_team_captain(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.generate_month_availability(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_current_month_availability() TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_monthly_penalties(DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_previous_month_penalties() TO service_role;
