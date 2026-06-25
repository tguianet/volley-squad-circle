-- Lovable Cloud feature sync: RPCs used by src/lib/match-availability.queries.ts,
-- src/lib/ranking.queries.ts and the challenge/team helpers. Idempotent.

CREATE OR REPLACE FUNCTION public.get_available_sundays(p_arena_id uuid DEFAULT NULL)
RETURNS TABLE(match_date date, free_slots_count integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_start INT; v_end INT;
BEGIN
  SELECT (value->>'start_hour')::INT, (value->>'end_hour')::INT
    INTO v_start, v_end FROM public.app_settings WHERE key = 'challenge_window';
  v_start := COALESCE(v_start, 8); v_end := COALESCE(v_end, 17);

  RETURN QUERY
  WITH sundays AS (
    SELECT (CURRENT_DATE + ((7 - EXTRACT(DOW FROM CURRENT_DATE)::INT) % 7) + (n * 7))::date AS d
    FROM generate_series(0, 5) n
  ),
  slots AS (SELECT make_time(h, 0, 0) AS t FROM generate_series(v_start, v_end - 1) h),
  active_courts AS (SELECT id, number FROM public.courts WHERE is_active),
  grid AS (
    SELECT s.d, c.id AS court_id, c.number AS court_number, sl.t
    FROM sundays s CROSS JOIN active_courts c CROSS JOIN slots sl
  )
  SELECT g.d, COUNT(*)::int
  FROM grid g
  WHERE NOT EXISTS (
    SELECT 1 FROM public.challenges ch
    WHERE ch.court_id = g.court_id AND ch.scheduled_date = g.d
      AND ch.scheduled_time = g.t AND ch.status = 'scheduled'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.date = g.d AND m.court_number = g.court_number
      AND m.status IN ('open', 'full')
      AND g.t >= m.start_time
      AND g.t < COALESCE(m.end_time, m.start_time + INTERVAL '1 hour')
  )
  GROUP BY g.d ORDER BY g.d;
END; $$;

GRANT EXECUTE ON FUNCTION public.get_available_sundays(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_court_availability(
  p_match_date date, p_start_time time, p_end_time time,
  p_arena_id uuid DEFAULT NULL, p_court_number integer DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_court_id uuid; v_end time;
BEGIN
  IF p_court_number IS NULL THEN RETURN false; END IF;
  v_end := COALESCE(p_end_time, p_start_time + INTERVAL '1 hour');

  SELECT id INTO v_court_id FROM public.courts
    WHERE number = p_court_number AND is_active LIMIT 1;
  IF v_court_id IS NULL THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.court_id = v_court_id AND c.scheduled_date = p_match_date
      AND c.status = 'scheduled'
      AND tsrange(
        (c.scheduled_date + c.scheduled_time)::timestamp,
        (c.scheduled_date + c.scheduled_time + (c.duration_minutes || ' minutes')::interval)::timestamp
      ) && tsrange((p_match_date + p_start_time)::timestamp, (p_match_date + v_end)::timestamp)
  ) THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.date = p_match_date AND m.court_number = p_court_number
      AND m.status IN ('open', 'full')
      AND tsrange(
        (m.date + m.start_time)::timestamp,
        (m.date + COALESCE(m.end_time, m.start_time + INTERVAL '1 hour'))::timestamp
      ) && tsrange((p_match_date + p_start_time)::timestamp, (p_match_date + v_end)::timestamp)
  ) THEN RETURN false; END IF;

  RETURN true;
END; $$;

GRANT EXECUTE ON FUNCTION public.check_court_availability(date, time, time, uuid, integer)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_challenge_by_rank(
  my_position integer, opponent_position integer
) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE
    WHEN my_position IS NULL OR opponent_position IS NULL THEN false
    WHEN my_position = opponent_position THEN false
    WHEN my_position BETWEEN 1 AND 5 AND opponent_position BETWEEN 1 AND 5 THEN true
    ELSE opponent_position >= my_position - 3 AND opponent_position <= my_position + 2
  END;
$$;

GRANT EXECUTE ON FUNCTION public.can_challenge_by_rank(integer, integer)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_team_ranking_complete(
  p_category text, p_member_count integer
) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path = public
AS $$
  SELECT CASE
    WHEN p_category = 'quarteto' THEN p_member_count = 4
    WHEN p_category = 'dupla' THEN p_member_count = 2
    ELSE false
  END;
$$;

GRANT EXECUTE ON FUNCTION public.is_team_ranking_complete(text, integer)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_team_ranking_details(p_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_summary jsonb; v_matches jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', t.id, 'name', t.name, 'category', t.category, 'gender', t.gender,
    'points', t.points, 'wins', t.wins, 'losses', t.losses,
    'rank_position', t.rank_position, 'current_streak', t.current_streak,
    'preferred_arena', CASE WHEN a.id IS NULL THEN NULL
      ELSE jsonb_build_object('name', a.name, 'city', a.city) END
  )
  INTO v_summary
  FROM public.teams t
  LEFT JOIN public.arenas a ON a.id = t.preferred_arena_id
  WHERE t.id = p_team_id;

  IF v_summary IS NULL THEN
    RETURN jsonb_build_object('summary', NULL, 'matches', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  INTO v_matches
  FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'date', c.scheduled_date, 'time', c.scheduled_time,
      'status', c.status,
      'score_for', CASE WHEN c.challenger_team_id = p_team_id
        THEN c.score_challenger ELSE c.score_challenged END,
      'score_against', CASE WHEN c.challenger_team_id = p_team_id
        THEN c.score_challenged ELSE c.score_challenger END,
      'won', CASE WHEN c.winner_team_id = p_team_id THEN true
        WHEN c.loser_team_id = p_team_id THEN false ELSE NULL END,
      'opponent', jsonb_build_object(
        'id', opp.id, 'name', opp.name, 'rank_position', opp.rank_position
      )
    ) AS row
    FROM public.challenges c
    JOIN public.teams opp ON opp.id = CASE
      WHEN c.challenger_team_id = p_team_id THEN c.challenged_team_id
      ELSE c.challenger_team_id END
    WHERE (c.challenger_team_id = p_team_id OR c.challenged_team_id = p_team_id)
      AND c.status IN ('scheduled', 'completed', 'awaiting_confirmation')
    ORDER BY c.scheduled_date DESC NULLS LAST
    LIMIT 20
  ) sub;

  RETURN jsonb_build_object('summary', v_summary, 'matches', v_matches);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_team_ranking_details(uuid)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_player_ranking_details(p_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_summary jsonb; v_matches jsonb;
BEGIN
  SELECT jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'apelido', p.apelido,
    'avatar_url', p.avatar_url, 'city', p.city, 'state', p.state,
    'gender', p.genero, 'points', p.pontos,
    'wins', p.vitorias, 'losses', p.derrotas, 'level', p.level
  )
  INTO v_summary
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_summary IS NULL THEN
    RETURN jsonb_build_object('summary', NULL, 'matches', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(row), '[]'::jsonb)
  INTO v_matches
  FROM (
    SELECT jsonb_build_object(
      'id', m.id, 'date', m.date, 'time', m.start_time,
      'title', m.title, 'status', m.status
    ) AS row
    FROM public.matches m
    JOIN public.match_players mp ON mp.match_id = m.id
    WHERE mp.player_id = p_profile_id AND mp.status = 'confirmed'
    ORDER BY m.date DESC
    LIMIT 20
  ) sub;

  RETURN jsonb_build_object('summary', v_summary, 'matches', v_matches);
END; $$;

GRANT EXECUTE ON FUNCTION public.get_player_ranking_details(uuid)
  TO anon, authenticated, service_role;