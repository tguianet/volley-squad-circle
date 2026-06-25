-- Torneios internos da arena

DO $$ BEGIN
  CREATE TYPE public.tournament_format AS ENUM ('ready_teams', 'team_draw');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.tournament_status AS ENUM (
    'draft',
    'open',
    'featured',
    'last_spots',
    'coming_soon',
    'closed',
    'finished'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category_label TEXT NOT NULL,
  arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
  image_url TEXT,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  entry_fee_cents INT NOT NULL DEFAULT 0 CHECK (entry_fee_cents >= 0),
  max_teams INT NOT NULL DEFAULT 16 CHECK (max_teams > 0),
  format public.tournament_format NOT NULL DEFAULT 'ready_teams',
  status public.tournament_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'waitlist')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_event_date ON public.tournaments (event_date);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments (status);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_tournament
  ON public.tournament_registrations (tournament_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournament_registrations TO authenticated;
GRANT ALL ON public.tournaments TO service_role;
GRANT ALL ON public.tournament_registrations TO service_role;

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tournaments readable by authenticated"
  ON public.tournaments FOR SELECT TO authenticated
  USING (status <> 'draft' OR created_by = auth.uid());

CREATE POLICY "staff manage tournaments"
  ON public.tournaments FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'moderator')
    )
  );

CREATE POLICY "registrations readable by authenticated"
  ON public.tournament_registrations FOR SELECT TO authenticated USING (true);

CREATE POLICY "user registers self"
  ON public.tournament_registrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user cancels own registration"
  ON public.tournament_registrations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user removes own registration"
  ON public.tournament_registrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_tournaments_updated
  BEFORE UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
