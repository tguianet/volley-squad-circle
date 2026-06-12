
-- =====================================================
-- 1) COURTS
-- =====================================================
CREATE TABLE IF NOT EXISTS public.courts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INT NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 99),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.courts TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.courts TO authenticated;
GRANT ALL ON public.courts TO service_role;

ALTER TABLE public.courts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Courts viewable by everyone" ON public.courts FOR SELECT USING (true);
CREATE POLICY "Admin manages courts" ON public.courts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_courts_updated_at BEFORE UPDATE ON public.courts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.courts (number, name)
SELECT n, 'Quadra ' || n FROM generate_series(1, 7) n
ON CONFLICT (number) DO NOTHING;

-- =====================================================
-- 2) CHALLENGES: quadra, duração, datas opcionais
-- =====================================================
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS court_id UUID REFERENCES public.courts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 60;

ALTER TABLE public.challenges ALTER COLUMN scheduled_date DROP NOT NULL;
ALTER TABLE public.challenges ALTER COLUMN scheduled_time DROP NOT NULL;

-- Novo status awaiting_schedule
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='awaiting_schedule'
    AND enumtypid='challenge_status'::regtype) THEN
    ALTER TYPE challenge_status ADD VALUE 'awaiting_schedule';
  END IF;
END $$;

-- Índice para conflito de quadra
CREATE INDEX IF NOT EXISTS idx_challenges_court_slot
  ON public.challenges (court_id, scheduled_date, scheduled_time)
  WHERE status = 'scheduled';

-- =====================================================
-- 3) TEAMS: W.O. e suspensão
-- =====================================================
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS wo_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS suspended_until DATE;

-- =====================================================
-- 4) APP SETTING: duração da partida
-- =====================================================
INSERT INTO public.app_settings (key, value, description)
VALUES ('match_duration_minutes', '60'::jsonb, 'Duração padrão de um desafio em minutos')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.app_settings (key, value, description)
VALUES ('challenge_window', '{"start_hour":8,"end_hour":17}'::jsonb, 'Janela permitida para desafios aos domingos')
ON CONFLICT (key) DO NOTHING;

-- =====================================================
-- 5) Trigger: W.O. progressivo
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_challenge_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_month DATE;
  v_winner_pos INT; v_loser_pos INT;
  v_winner_cat team_category; v_winner_gen team_gender;
  v_loser_cat team_category; v_loser_gen team_gender;
  v_middle_team UUID;
  v_new_wo_count INT;
  v_penalty INT;
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  v_month := date_trunc('month', COALESCE(NEW.scheduled_date, now()::DATE))::DATE;

  IF NEW.status='declined' THEN
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'declined', -30, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;
    UPDATE public.teams SET points = points - 30 WHERE id = NEW.challenged_team_id;
    NEW.responded_at := COALESCE(NEW.responded_at, now());

    SELECT category, gender INTO v_loser_cat, v_loser_gen FROM public.teams WHERE id=NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen); END IF;

  ELSIF NEW.status='wo' THEN
    -- Incrementa contagem e aplica penalidade progressiva
    UPDATE public.teams
      SET wo_count = wo_count + 1
      WHERE id = NEW.challenged_team_id
      RETURNING wo_count INTO v_new_wo_count;

    IF v_new_wo_count = 1 THEN
      v_penalty := -20;
      UPDATE public.teams SET points = points + v_penalty WHERE id = NEW.challenged_team_id;
    ELSIF v_new_wo_count = 2 THEN
      v_penalty := -20;
      UPDATE public.teams
        SET points = points + v_penalty,
            suspended_until = (now()::DATE + INTERVAL '15 days')::DATE
        WHERE id = NEW.challenged_team_id;
    ELSE
      v_penalty := -50;
      UPDATE public.teams
        SET points = points + v_penalty,
            is_active = false,
            rank_position = NULL
        WHERE id = NEW.challenged_team_id;
    END IF;

    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'walkover', v_penalty, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;

    SELECT category, gender INTO v_loser_cat, v_loser_gen FROM public.teams WHERE id=NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen); END IF;

    -- Notificações
    INSERT INTO public.notifications (user_id, kind, title, body, link_url)
    SELECT t.captain_id, 'wo_penalty',
      CASE v_new_wo_count
        WHEN 1 THEN 'W.O. registrado (-20 pts)'
        WHEN 2 THEN 'Segundo W.O. — suspensão de 15 dias'
        ELSE 'Terceiro W.O. — removido do ranking'
      END,
      'Sua equipe ' || t.name || ' acumulou ' || v_new_wo_count || ' W.O.',
      '/desafios'
    FROM public.teams t WHERE t.id = NEW.challenged_team_id;

  ELSIF NEW.status='completed' THEN
    IF NEW.winner_team_id IS NOT NULL AND NEW.loser_team_id IS NOT NULL THEN
      UPDATE public.teams SET wins=wins+1, current_streak=current_streak+1 WHERE id=NEW.winner_team_id;
      UPDATE public.teams SET losses=losses+1, current_streak=0 WHERE id=NEW.loser_team_id;

      SELECT rank_position, category, gender INTO v_winner_pos, v_winner_cat, v_winner_gen
        FROM public.teams WHERE id=NEW.winner_team_id;
      SELECT rank_position, category, gender INTO v_loser_pos, v_loser_cat, v_loser_gen
        FROM public.teams WHERE id=NEW.loser_team_id;

      IF v_winner_cat=v_loser_cat AND v_winner_gen=v_loser_gen
         AND v_winner_pos IS NOT NULL AND v_loser_pos IS NOT NULL
         AND v_winner_pos > v_loser_pos THEN
        IF v_winner_pos <= 3 THEN
          UPDATE public.teams SET rank_position=v_loser_pos WHERE id=NEW.winner_team_id;
          UPDATE public.teams SET rank_position=v_winner_pos WHERE id=NEW.loser_team_id;
        ELSIF v_loser_pos <= 3 THEN
          IF v_loser_pos + 1 <= 3 THEN
            DECLARE cur_pos INT := v_loser_pos + 1;
                    prev_team UUID := NEW.loser_team_id;
                    swap_team UUID;
            BEGIN
              WHILE cur_pos <= 3 LOOP
                SELECT id INTO swap_team FROM public.teams
                  WHERE category=v_winner_cat AND gender=v_winner_gen
                    AND rank_position=cur_pos AND is_active=true LIMIT 1;
                UPDATE public.teams SET rank_position=cur_pos WHERE id=prev_team;
                prev_team := swap_team;
                cur_pos := cur_pos + 1;
                EXIT WHEN swap_team IS NULL;
              END LOOP;
              IF prev_team IS NOT NULL THEN
                UPDATE public.teams SET rank_position=v_winner_pos WHERE id=prev_team;
              END IF;
              UPDATE public.teams SET rank_position=v_loser_pos WHERE id=NEW.winner_team_id;
            END;
          ELSE
            SELECT id INTO v_middle_team FROM public.teams
              WHERE category=v_winner_cat AND gender=v_winner_gen
                AND rank_position=v_loser_pos+1 AND is_active=true LIMIT 1;
            UPDATE public.teams SET rank_position=v_loser_pos WHERE id=NEW.winner_team_id;
            UPDATE public.teams SET rank_position=v_loser_pos+1 WHERE id=NEW.loser_team_id;
            IF v_middle_team IS NOT NULL AND v_middle_team <> NEW.winner_team_id THEN
              UPDATE public.teams SET rank_position=v_winner_pos WHERE id=v_middle_team;
            END IF;
          END IF;
        END IF;
      END IF;

      IF v_winner_cat IS NOT NULL THEN
        PERFORM public.recompute_ranks_below_podium(v_winner_cat, v_winner_gen);
      END IF;
    END IF;

  ELSIF NEW.status='scheduled' THEN
    NEW.responded_at := COALESCE(NEW.responded_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

-- =====================================================
-- 6) RPC: schedule_challenge
-- =====================================================
CREATE OR REPLACE FUNCTION public.schedule_challenge(
  _challenge_id UUID,
  _date DATE,
  _time TIME,
  _court_id UUID
) RETURNS public.challenges
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_ch public.challenges;
  v_duration INT;
  v_start_hour INT;
  v_end_hour INT;
  v_end_time TIME;
  v_today DATE := now()::DATE;
  v_chal_susp DATE;
  v_chd_susp DATE;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;

  -- Autorização: capitão do desafiante ou admin
  IF NOT (public.is_team_captain(auth.uid(), v_ch.challenger_team_id)
       OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Apenas o capitão desafiante pode agendar';
  END IF;

  IF v_ch.status NOT IN ('awaiting_schedule', 'pending', 'reschedule_requested') THEN
    RAISE EXCEPTION 'Desafio em status inválido para agendamento (%) ', v_ch.status;
  END IF;

  -- Apenas domingo
  IF EXTRACT(DOW FROM _date) <> 0 THEN
    RAISE EXCEPTION 'Desafios só podem ser agendados aos domingos';
  END IF;

  IF _date < v_today THEN
    RAISE EXCEPTION 'Data não pode ser no passado';
  END IF;

  -- Janela horária
  SELECT (value->>'start_hour')::INT, (value->>'end_hour')::INT
    INTO v_start_hour, v_end_hour
    FROM public.app_settings WHERE key='challenge_window';
  v_start_hour := COALESCE(v_start_hour, 8);
  v_end_hour := COALESCE(v_end_hour, 17);

  SELECT (value)::TEXT::INT INTO v_duration
    FROM public.app_settings WHERE key='match_duration_minutes';
  v_duration := COALESCE(v_duration, 60);

  v_end_time := (_time + (v_duration || ' minutes')::INTERVAL)::TIME;

  IF EXTRACT(HOUR FROM _time) < v_start_hour
     OR (v_end_time > make_time(v_end_hour, 0, 0)) THEN
    RAISE EXCEPTION 'Horário fora da janela permitida (% às %)', v_start_hour, v_end_hour;
  END IF;

  -- Quadra ativa
  IF NOT EXISTS (SELECT 1 FROM public.courts WHERE id=_court_id AND is_active) THEN
    RAISE EXCEPTION 'Quadra inválida ou inativa';
  END IF;

  -- Suspensão
  SELECT suspended_until INTO v_chal_susp FROM public.teams WHERE id=v_ch.challenger_team_id;
  SELECT suspended_until INTO v_chd_susp FROM public.teams WHERE id=v_ch.challenged_team_id;
  IF (v_chal_susp IS NOT NULL AND v_chal_susp >= v_today)
     OR (v_chd_susp IS NOT NULL AND v_chd_susp >= v_today) THEN
    RAISE EXCEPTION 'Uma das equipes está suspensa';
  END IF;

  -- Conflito de quadra (sobreposição de intervalos)
  IF EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.court_id = _court_id
      AND c.scheduled_date = _date
      AND c.status = 'scheduled'
      AND c.id <> _challenge_id
      AND tsrange(
            (c.scheduled_date + c.scheduled_time)::TIMESTAMP,
            (c.scheduled_date + c.scheduled_time + (c.duration_minutes || ' minutes')::INTERVAL)::TIMESTAMP
          )
          && tsrange(
            (_date + _time)::TIMESTAMP,
            (_date + _time + (v_duration || ' minutes')::INTERVAL)::TIMESTAMP
          )
  ) THEN
    RAISE EXCEPTION 'Quadra já reservada nesse horário';
  END IF;

  UPDATE public.challenges
    SET scheduled_date = _date,
        scheduled_time = _time,
        court_id = _court_id,
        duration_minutes = v_duration,
        status = 'scheduled',
        responded_at = now()
    WHERE id = _challenge_id
    RETURNING * INTO v_ch;

  -- Notifica os dois capitães
  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT t.captain_id, 'challenge_scheduled',
         'Desafio agendado',
         'Domingo ' || to_char(_date,'DD/MM') || ' às ' || to_char(_time,'HH24:MI')
         || ' — ' || (SELECT name FROM public.courts WHERE id=_court_id),
         '/desafios'
  FROM public.teams t
  WHERE t.id IN (v_ch.challenger_team_id, v_ch.challenged_team_id);

  RETURN v_ch;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.schedule_challenge(UUID, DATE, TIME, UUID) TO authenticated;

-- =====================================================
-- 7) RPC: court_availability(date) — slots livres por quadra
-- =====================================================
CREATE OR REPLACE FUNCTION public.court_availability(_date DATE)
RETURNS TABLE(court_id UUID, court_number INT, court_name TEXT, slot_time TIME, is_free BOOLEAN)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_start INT; v_end INT;
BEGIN
  SELECT (value->>'start_hour')::INT, (value->>'end_hour')::INT
    INTO v_start, v_end FROM public.app_settings WHERE key='challenge_window';
  v_start := COALESCE(v_start, 8); v_end := COALESCE(v_end, 17);

  RETURN QUERY
  WITH slots AS (
    SELECT make_time(h, 0, 0) AS slot_time
    FROM generate_series(v_start, v_end - 1) h
  ),
  active_courts AS (
    SELECT id, number, name FROM public.courts WHERE is_active ORDER BY number
  )
  SELECT c.id, c.number, c.name, s.slot_time,
    NOT EXISTS (
      SELECT 1 FROM public.challenges ch
      WHERE ch.court_id = c.id
        AND ch.scheduled_date = _date
        AND ch.status = 'scheduled'
        AND ch.scheduled_time = s.slot_time
    ) AS is_free
  FROM active_courts c CROSS JOIN slots s
  ORDER BY c.number, s.slot_time;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.court_availability(DATE) TO authenticated;
