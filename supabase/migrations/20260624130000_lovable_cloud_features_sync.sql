-- Sincronização idempotente: desafios/ranking, agenda de quadras, partidas amistosas, ranking detalhado.
-- Compatível com Lovable Cloud (reaplicável sem quebrar se partes já existirem).

-- ── Partidas amistosas: court_number ─────────────────────────────────────────
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS court_number INT;

UPDATE public.matches SET court_number = 1 WHERE court_number IS NULL;

ALTER TABLE public.matches
  ALTER COLUMN court_number SET DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_court_number_check'
  ) THEN
    ALTER TABLE public.matches
      ADD CONSTRAINT matches_court_number_check CHECK (court_number BETWEEN 1 AND 7);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

ALTER TABLE public.matches
  ALTER COLUMN court_number SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_matches_court_slot
  ON public.matches (date, arena_id, court_number, start_time)
  WHERE status <> 'cancelled';

-- ── Agenda de quadras (RPCs) ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._match_effective_end(p_start TIME, p_end TIME)
RETURNS TIME
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(p_end, p_start + interval '1 hour')::time;
$$;

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
  IF p_arena_id IS NULL THEN RETURN; END IF;

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
  courts AS (SELECT generate_series(1, 7) AS court_number),
  slot_availability AS (
    SELECT s.d AS match_date, sl.start_time,
      EXISTS (
        SELECT 1 FROM courts c
        WHERE NOT public._has_court_conflict(
          s.d, p_arena_id, c.court_number, sl.start_time, sl.end_time
        )
      ) AS has_free_court
    FROM sundays s CROSS JOIN slots sl
  )
  SELECT sa.match_date, COUNT(*) FILTER (WHERE sa.has_free_court)::int
  FROM slot_availability sa
  GROUP BY sa.match_date
  HAVING COUNT(*) FILTER (WHERE sa.has_free_court) > 0
  ORDER BY sa.match_date;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_available_time_slots(p_match_date DATE, p_arena_id UUID)
RETURNS TABLE(start_time TIME, end_time TIME, available_courts_count INT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_arena_id IS NULL OR p_match_date IS NULL THEN RETURN; END IF;
  IF EXTRACT(DOW FROM p_match_date)::int <> 0 THEN RETURN; END IF;

  RETURN QUERY
  WITH slots AS (
    SELECT make_time(h, 0, 0) AS start_time, make_time(h + 1, 0, 0) AS end_time
    FROM generate_series(8, 16) AS h
  ),
  courts AS (SELECT generate_series(1, 7) AS court_number),
  slot_counts AS (
    SELECT sl.start_time, sl.end_time,
      COUNT(*) FILTER (
        WHERE NOT public._has_court_conflict(
          p_match_date, p_arena_id, c.court_number, sl.start_time, sl.end_time
        )
      )::int AS available_courts_count
    FROM slots sl CROSS JOIN courts c
    GROUP BY sl.start_time, sl.end_time
  )
  SELECT sc.start_time, sc.end_time, sc.available_courts_count
  FROM slot_counts sc
  WHERE sc.available_courts_count > 0
  ORDER BY sc.start_time;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_available_courts(
  p_match_date DATE, p_start_time TIME, p_end_time TIME, p_arena_id UUID
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
  WHERE c.is_active AND c.number BETWEEN 1 AND 7
    AND NOT public._has_court_conflict(
      p_match_date, p_arena_id, c.number, p_start_time, p_end_time
    )
  ORDER BY c.number;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_court_availability(
  p_match_date DATE, p_start_time TIME, p_end_time TIME, p_arena_id UUID, p_court_number INT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF p_arena_id IS NULL OR p_match_date IS NULL OR p_start_time IS NULL
     OR p_end_time IS NULL OR p_court_number IS NULL THEN
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

-- ── Regras de desafio / ranking ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_challenge_by_rank(_my_pos INT, _opponent_pos INT)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT _my_pos IS NOT NULL AND _opponent_pos IS NOT NULL AND _my_pos <> _opponent_pos
    AND (
      (_my_pos BETWEEN 1 AND 5 AND _opponent_pos BETWEEN 1 AND 5)
      OR (_opponent_pos >= _my_pos - 3 AND _opponent_pos <= _my_pos + 2)
    );
$$;

CREATE OR REPLACE FUNCTION public.team_confirmed_member_count(_team_id UUID)
RETURNS INT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.team_members WHERE team_id = _team_id;
$$;

CREATE OR REPLACE FUNCTION public.is_team_ranking_complete(_team_id UUID)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE t.category
    WHEN 'dupla' THEN public.team_confirmed_member_count(_team_id) = 2
    WHEN 'quarteto' THEN public.team_confirmed_member_count(_team_id) = 4
    ELSE false END
  FROM public.teams t WHERE t.id = _team_id;
$$;

CREATE OR REPLACE FUNCTION public.validate_challenge_ranking_rules(
  _challenger_team_id UUID, _challenged_team_id UUID
)
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_ch RECORD; v_cd RECORD;
BEGIN
  IF _challenger_team_id = _challenged_team_id THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking.';
  END IF;

  SELECT id, category, gender, rank_position, is_active INTO v_ch
    FROM public.teams WHERE id = _challenger_team_id;
  SELECT id, category, gender, rank_position, is_active INTO v_cd
    FROM public.teams WHERE id = _challenged_team_id;

  IF v_ch.id IS NULL OR v_cd.id IS NULL OR NOT v_ch.is_active OR NOT v_cd.is_active
     OR v_ch.rank_position IS NULL OR v_cd.rank_position IS NULL
     OR v_ch.category IS DISTINCT FROM v_cd.category
     OR v_ch.gender IS DISTINCT FROM v_cd.gender
     OR NOT public.is_team_ranking_complete(_challenger_team_id)
     OR NOT public.is_team_ranking_complete(_challenged_team_id)
     OR NOT public.can_challenge_by_rank(v_ch.rank_position, v_cd.rank_position)
  THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_challenge_before_insert()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_team_captain(auth.uid(), NEW.challenger_team_id)
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking.';
  END IF;
  PERFORM public.validate_challenge_ranking_rules(NEW.challenger_team_id, NEW.challenged_team_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_challenge_insert ON public.challenges;
CREATE TRIGGER trg_validate_challenge_insert
  BEFORE INSERT ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.validate_challenge_before_insert();

CREATE OR REPLACE FUNCTION public.handle_challenge_status_change()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_month DATE; v_challenger_pos INT; v_challenged_pos INT;
  v_loser_cat team_category; v_loser_gen team_gender;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  v_month := date_trunc('month', NEW.scheduled_date)::DATE;

  IF NEW.status = 'declined' THEN
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'declined', -30, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;
    UPDATE public.teams SET points = points - 30 WHERE id = NEW.challenged_team_id;
    NEW.responded_at := COALESCE(NEW.responded_at, now());
    SELECT category, gender INTO v_loser_cat, v_loser_gen FROM public.teams WHERE id = NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen); END IF;

  ELSIF NEW.status = 'wo' THEN
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'walkover', -50, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;
    UPDATE public.teams SET points = points - 50 WHERE id = NEW.challenged_team_id;
    SELECT category, gender INTO v_loser_cat, v_loser_gen FROM public.teams WHERE id = NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen); END IF;

  ELSIF NEW.status = 'completed' THEN
    IF NEW.winner_team_id IS NOT NULL AND NEW.loser_team_id IS NOT NULL THEN
      UPDATE public.teams SET wins = wins + 1, current_streak = current_streak + 1 WHERE id = NEW.winner_team_id;
      UPDATE public.teams SET losses = losses + 1, current_streak = 0 WHERE id = NEW.loser_team_id;
      IF NEW.winner_team_id = NEW.challenger_team_id THEN
        SELECT rank_position INTO v_challenger_pos FROM public.teams WHERE id = NEW.challenger_team_id;
        SELECT rank_position INTO v_challenged_pos FROM public.teams WHERE id = NEW.challenged_team_id;
        IF v_challenger_pos IS NOT NULL AND v_challenged_pos IS NOT NULL THEN
          UPDATE public.teams SET rank_position = v_challenged_pos WHERE id = NEW.challenger_team_id;
          UPDATE public.teams SET rank_position = v_challenger_pos WHERE id = NEW.challenged_team_id;
        END IF;
      END IF;
    END IF;
  ELSIF NEW.status = 'scheduled' THEN
    NEW.responded_at := COALESCE(NEW.responded_at, now());
  END IF;
  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_challenge_by_rank(INT, INT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.team_confirmed_member_count(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_team_ranking_complete(UUID) TO authenticated, anon;

-- ── Ranking detalhado (RPCs) ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_team_ranking_details(p_team_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_team RECORD; v_matches JSON; v_summary JSON;
BEGIN
  SELECT id, name, wins, losses, points, rank_position, updated_at, category, gender
    INTO v_team FROM public.teams WHERE id = p_team_id AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('summary', NULL, 'matches', '[]'::json); END IF;

  SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.sort_date DESC, m.sort_time DESC), '[]'::json)
  INTO v_matches FROM (
    SELECT c.id AS challenge_id, c.scheduled_date AS match_date, c.scheduled_time AS match_time,
      'Desafio de ranking' AS competition,
      CASE WHEN c.challenger_team_id = p_team_id THEN opp.name ELSE chal.name END AS opponent_name,
      CASE WHEN c.winner_team_id = p_team_id THEN 'V' WHEN c.loser_team_id = p_team_id THEN 'D' ELSE '—' END AS outcome,
      CASE WHEN c.challenger_team_id = p_team_id
        THEN COALESCE(c.score_challenger::text, '—') || ' x ' || COALESCE(c.score_challenged::text, '—')
        ELSE COALESCE(c.score_challenged::text, '—') || ' x ' || COALESCE(c.score_challenger::text, '—')
      END AS score_label,
      COALESCE(mp.points, 0) AS points_gained,
      v_team.rank_position AS rank_position,
      COALESCE(c.scheduled_date, c.updated_at::date) AS sort_date,
      COALESCE(c.scheduled_time, '00:00:00'::time) AS sort_time
    FROM public.challenges c
    JOIN public.teams chal ON chal.id = c.challenger_team_id
    JOIN public.teams opp ON opp.id = c.challenged_team_id
    LEFT JOIN public.monthly_penalties mp ON mp.challenge_id = c.id AND mp.team_id = p_team_id
    WHERE c.status = 'completed'
      AND (c.challenger_team_id = p_team_id OR c.challenged_team_id = p_team_id)
  ) m;

  SELECT json_build_object(
    'wins', v_team.wins, 'losses', v_team.losses,
    'games', v_team.wins + v_team.losses,
    'win_rate', CASE WHEN v_team.wins + v_team.losses > 0
      THEN ROUND((v_team.wins::numeric / (v_team.wins + v_team.losses)::numeric) * 100) ELSE 0 END,
    'points', v_team.points, 'rank_position', v_team.rank_position,
    'last_updated', v_team.updated_at,
    'last_five', (
      SELECT COALESCE(json_agg(sub.outcome ORDER BY sub.sort_date DESC, sub.sort_time DESC), '[]'::json)
      FROM (
        SELECT CASE WHEN c.winner_team_id = p_team_id THEN 'V'
          WHEN c.loser_team_id = p_team_id THEN 'D' ELSE '—' END AS outcome,
          COALESCE(c.scheduled_date, c.updated_at::date) AS sort_date,
          COALESCE(c.scheduled_time, '00:00:00'::time) AS sort_time
        FROM public.challenges c
        WHERE c.status = 'completed'
          AND (c.challenger_team_id = p_team_id OR c.challenged_team_id = p_team_id)
        ORDER BY sort_date DESC, sort_time DESC LIMIT 5
      ) sub
    ),
    'best_set_score', (
      SELECT MAX(CASE WHEN c.challenger_team_id = p_team_id THEN c.score_challenger ELSE c.score_challenged END)
      FROM public.challenges c
      WHERE c.status = 'completed'
        AND (c.challenger_team_id = p_team_id OR c.challenged_team_id = p_team_id)
    )
  ) INTO v_summary;

  RETURN json_build_object('summary', v_summary, 'matches', v_matches);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_player_ranking_details(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_profile RECORD; v_matches JSON; v_summary JSON;
BEGIN
  SELECT id, display_name, pontos, vitorias, derrotas, updated_at
    INTO v_profile FROM public.profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN RETURN json_build_object('summary', NULL, 'matches', '[]'::json); END IF;

  SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.sort_date DESC), '[]'::json)
  INTO v_matches FROM (
    SELECT m.id AS match_id, m.date AS match_date, m.title AS competition, m.status,
      'Participação' AS outcome, '—' AS score_label, 0 AS points_gained,
      NULL::int AS rank_position, m.date AS sort_date
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.player_id = p_profile_id AND mp.status = 'confirmed' AND m.status = 'finished'
  ) m;

  SELECT json_build_object(
    'wins', v_profile.vitorias, 'losses', v_profile.derrotas,
    'games', v_profile.vitorias + v_profile.derrotas,
    'win_rate', CASE WHEN v_profile.vitorias + v_profile.derrotas > 0
      THEN ROUND((v_profile.vitorias::numeric / (v_profile.vitorias + v_profile.derrotas)::numeric) * 100) ELSE 0 END,
    'points', v_profile.pontos, 'rank_position', NULL,
    'last_updated', v_profile.updated_at,
    'last_five', '[]'::json, 'best_set_score', NULL
  ) INTO v_summary;

  RETURN json_build_object('summary', v_summary, 'matches', v_matches);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_team_ranking_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_ranking_details(UUID) TO authenticated;
