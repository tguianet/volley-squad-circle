-- RPCs para detalhes expandíveis do ranking

CREATE OR REPLACE FUNCTION public.get_team_ranking_details(p_team_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_team RECORD;
  v_matches JSON;
  v_summary JSON;
BEGIN
  SELECT
    id,
    name,
    wins,
    losses,
    points,
    rank_position,
    updated_at,
    category,
    gender
  INTO v_team
  FROM public.teams
  WHERE id = p_team_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('summary', NULL, 'matches', '[]'::json);
  END IF;

  SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.sort_date DESC, m.sort_time DESC), '[]'::json)
  INTO v_matches
  FROM (
    SELECT
      c.id AS challenge_id,
      c.scheduled_date AS match_date,
      c.scheduled_time AS match_time,
      'Desafio de ranking' AS competition,
      CASE
        WHEN c.challenger_team_id = p_team_id THEN opp.name
        ELSE chal.name
      END AS opponent_name,
      CASE
        WHEN c.winner_team_id = p_team_id THEN 'V'
        WHEN c.loser_team_id = p_team_id THEN 'D'
        ELSE '—'
      END AS outcome,
      CASE
        WHEN c.challenger_team_id = p_team_id THEN
          COALESCE(c.score_challenger::text, '—') || ' x ' || COALESCE(c.score_challenged::text, '—')
        ELSE
          COALESCE(c.score_challenged::text, '—') || ' x ' || COALESCE(c.score_challenger::text, '—')
      END AS score_label,
      COALESCE(mp.points, 0) AS points_gained,
      v_team.rank_position AS rank_position,
      COALESCE(c.scheduled_date, c.updated_at::date) AS sort_date,
      COALESCE(c.scheduled_time, '00:00:00'::time) AS sort_time
    FROM public.challenges c
    JOIN public.teams chal ON chal.id = c.challenger_team_id
    JOIN public.teams opp ON opp.id = c.challenged_team_id
    LEFT JOIN public.monthly_penalties mp
      ON mp.challenge_id = c.id AND mp.team_id = p_team_id
    WHERE c.status = 'completed'
      AND (c.challenger_team_id = p_team_id OR c.challenged_team_id = p_team_id)
  ) m;

  SELECT json_build_object(
    'wins', v_team.wins,
    'losses', v_team.losses,
    'games', v_team.wins + v_team.losses,
    'win_rate',
      CASE
        WHEN v_team.wins + v_team.losses > 0
        THEN ROUND((v_team.wins::numeric / (v_team.wins + v_team.losses)::numeric) * 100)
        ELSE 0
      END,
    'points', v_team.points,
    'rank_position', v_team.rank_position,
    'last_updated', v_team.updated_at,
    'last_five', (
      SELECT COALESCE(json_agg(sub.outcome ORDER BY sub.sort_date DESC, sub.sort_time DESC), '[]'::json)
      FROM (
        SELECT
          CASE
            WHEN c.winner_team_id = p_team_id THEN 'V'
            WHEN c.loser_team_id = p_team_id THEN 'D'
            ELSE '—'
          END AS outcome,
          COALESCE(c.scheduled_date, c.updated_at::date) AS sort_date,
          COALESCE(c.scheduled_time, '00:00:00'::time) AS sort_time
        FROM public.challenges c
        WHERE c.status = 'completed'
          AND (c.challenger_team_id = p_team_id OR c.challenged_team_id = p_team_id)
        ORDER BY sort_date DESC, sort_time DESC
        LIMIT 5
      ) sub
    ),
    'best_set_score', (
      SELECT MAX(
        CASE
          WHEN c.challenger_team_id = p_team_id THEN c.score_challenger
          ELSE c.score_challenged
        END
      )
      FROM public.challenges c
      WHERE c.status = 'completed'
        AND (c.challenger_team_id = p_team_id OR c.challenged_team_id = p_team_id)
    )
  )
  INTO v_summary;

  RETURN json_build_object('summary', v_summary, 'matches', v_matches);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_player_ranking_details(p_profile_id UUID)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile RECORD;
  v_matches JSON;
  v_summary JSON;
BEGIN
  SELECT
    id,
    display_name,
    pontos,
    vitorias,
    derrotas,
    updated_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RETURN json_build_object('summary', NULL, 'matches', '[]'::json);
  END IF;

  SELECT COALESCE(json_agg(row_to_json(m) ORDER BY m.sort_date DESC), '[]'::json)
  INTO v_matches
  FROM (
    SELECT
      m.id AS match_id,
      m.date AS match_date,
      m.title AS competition,
      m.status,
      'Participação' AS outcome,
      '—' AS score_label,
      0 AS points_gained,
      NULL::int AS rank_position,
      m.date AS sort_date
    FROM public.match_players mp
    JOIN public.matches m ON m.id = mp.match_id
    WHERE mp.player_id = p_profile_id
      AND mp.status = 'confirmed'
      AND m.status = 'finished'
  ) m;

  SELECT json_build_object(
    'wins', v_profile.vitorias,
    'losses', v_profile.derrotas,
    'games', v_profile.vitorias + v_profile.derrotas,
    'win_rate',
      CASE
        WHEN v_profile.vitorias + v_profile.derrotas > 0
        THEN ROUND((v_profile.vitorias::numeric / (v_profile.vitorias + v_profile.derrotas)::numeric) * 100)
        ELSE 0
      END,
    'points', v_profile.pontos,
    'rank_position', NULL,
    'last_updated', v_profile.updated_at,
    'last_five', '[]'::json,
    'best_set_score', NULL
  )
  INTO v_summary;

  RETURN json_build_object('summary', v_summary, 'matches', v_matches);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_team_ranking_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_ranking_details(UUID) TO authenticated;
