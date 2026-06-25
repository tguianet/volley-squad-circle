-- Enums (idempotent)
DO $$ BEGIN
  CREATE TYPE public.tournament_format AS ENUM ('ready_teams', 'team_draw');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tournament_status AS ENUM ('draft','coming_soon','open','featured','last_spots','closed','finished');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_label TEXT NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  entry_fee_cents INTEGER NOT NULL DEFAULT 0,
  max_teams INTEGER NOT NULL DEFAULT 16,
  format public.tournament_format NOT NULL DEFAULT 'ready_teams',
  status public.tournament_status NOT NULL DEFAULT 'open',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  image_url TEXT,
  arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.tournaments TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT ALL ON public.tournaments TO service_role;

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tournaments_select_all" ON public.tournaments;
CREATE POLICY "tournaments_select_all" ON public.tournaments
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tournaments_admin_write" ON public.tournaments;
CREATE POLICY "tournaments_admin_write" ON public.tournaments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Registrations table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_registrations TO authenticated;
GRANT ALL ON public.tournament_registrations TO service_role;

ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "registrations_select_own_or_admin" ON public.tournament_registrations;
CREATE POLICY "registrations_select_own_or_admin" ON public.tournament_registrations
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "registrations_insert_self" ON public.tournament_registrations;
CREATE POLICY "registrations_insert_self" ON public.tournament_registrations
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "registrations_update_own" ON public.tournament_registrations;
CREATE POLICY "registrations_update_own" ON public.tournament_registrations
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "registrations_delete_own" ON public.tournament_registrations;
CREATE POLICY "registrations_delete_own" ON public.tournament_registrations
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.tournaments_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_tournaments_updated_at ON public.tournaments;
CREATE TRIGGER trg_tournaments_updated_at
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.tournaments_set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS tournaments_event_date_idx ON public.tournaments(event_date);
CREATE INDEX IF NOT EXISTS tournaments_status_idx ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS tournament_registrations_user_idx ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS tournament_registrations_tournament_idx ON public.tournament_registrations(tournament_id);
