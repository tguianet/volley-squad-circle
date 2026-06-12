
-- ENUMS
DO $$ BEGIN
  CREATE TYPE public.match_modality AS ENUM ('beach_volley','indoor_volley','futevolei');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.match_type AS ENUM ('dupla','quarteto','sexteto');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.match_status AS ENUM ('open','full','finished','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.match_player_status AS ENUM ('confirmed','waiting','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.match_team AS ENUM ('A','B');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  modality public.match_modality NOT NULL DEFAULT 'beach_volley',
  match_type public.match_type NOT NULL DEFAULT 'dupla',
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  max_players INT NOT NULL DEFAULT 4,
  status public.match_status NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT ALL ON public.matches TO service_role;

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches viewable by authenticated"
  ON public.matches FOR SELECT TO authenticated USING (true);

CREATE POLICY "users create their own matches"
  ON public.matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "creator updates own match"
  ON public.matches FOR UPDATE TO authenticated
  USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "creator deletes own match"
  ON public.matches FOR DELETE TO authenticated
  USING (auth.uid() = creator_id);

CREATE TRIGGER trg_matches_updated
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- match_players
CREATE TABLE public.match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status public.match_player_status NOT NULL DEFAULT 'confirmed',
  team public.match_team,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_players TO authenticated;
GRANT ALL ON public.match_players TO service_role;

ALTER TABLE public.match_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "match_players viewable by authenticated"
  ON public.match_players FOR SELECT TO authenticated USING (true);

CREATE POLICY "user joins as self"
  ON public.match_players FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = player_id);

CREATE POLICY "user updates own inscription or creator updates"
  ON public.match_players FOR UPDATE TO authenticated
  USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.creator_id = auth.uid())
  );

CREATE POLICY "user removes own inscription or creator removes"
  ON public.match_players FOR DELETE TO authenticated
  USING (
    auth.uid() = player_id
    OR EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.creator_id = auth.uid())
  );

-- Auto-add creator to match_players on match insert
CREATE OR REPLACE FUNCTION public.handle_new_match()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.match_players (match_id, player_id, status)
  VALUES (NEW.id, NEW.creator_id, 'confirmed')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_match_creator_join
  AFTER INSERT ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_match();

-- Update match status when players join/leave & notify creator
CREATE OR REPLACE FUNCTION public.handle_match_player_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match RECORD;
  v_count INT;
  v_player_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_match FROM public.matches WHERE id = NEW.match_id;
    SELECT COUNT(*) INTO v_count FROM public.match_players
      WHERE match_id = NEW.match_id AND status = 'confirmed';
    IF v_count >= v_match.max_players AND v_match.status = 'open' THEN
      UPDATE public.matches SET status = 'full' WHERE id = NEW.match_id;
    END IF;
    -- Notify creator if joiner is not the creator
    IF NEW.player_id <> v_match.creator_id AND NEW.status = 'confirmed' THEN
      SELECT COALESCE(display_name, username, 'Um jogador') INTO v_player_name
        FROM public.profiles WHERE id = NEW.player_id;
      INSERT INTO public.notifications (user_id, kind, title, body, data)
      VALUES (
        v_match.creator_id,
        'match_join',
        'Novo jogador na sua partida',
        v_player_name || ' entrou em "' || v_match.title || '"',
        jsonb_build_object('match_id', v_match.id)
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT * INTO v_match FROM public.matches WHERE id = OLD.match_id;
    SELECT COUNT(*) INTO v_count FROM public.match_players
      WHERE match_id = OLD.match_id AND status = 'confirmed';
    IF v_count < v_match.max_players AND v_match.status = 'full' THEN
      UPDATE public.matches SET status = 'open' WHERE id = OLD.match_id;
    END IF;
  END IF;
  RETURN NULL;
END; $$;

CREATE TRIGGER trg_match_player_change
  AFTER INSERT OR DELETE ON public.match_players
  FOR EACH ROW EXECUTE FUNCTION public.handle_match_player_change();

CREATE INDEX idx_matches_status_date ON public.matches(status, date);
CREATE INDEX idx_match_players_player ON public.match_players(player_id);
CREATE INDEX idx_match_players_match ON public.match_players(match_id);
