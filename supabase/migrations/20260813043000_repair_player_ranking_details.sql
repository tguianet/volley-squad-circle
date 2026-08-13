-- Restaura o contrato consumido pelo painel de detalhes do ranking individual.
-- A definição no Lovable Cloud havia regredido para um payload legado.

CREATE OR REPLACE FUNCTION public.get_player_ranking_details(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_profile RECORD;
  v_matches JSONB;
  v_summary JSONB;
BEGIN
  SELECT id, display_name, pontos, vitorias, derrotas, updated_at
  INTO v_profile
  FROM public.profiles
  WHERE id = p_profile_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('summary', NULL, 'matches', '[]'::jsonb);
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(m) ORDER BY m.sort_date DESC, m.sort_time DESC), '[]'::jsonb)
  INTO v_matches
  FROM (
    SELECT
      matches.id AS match_id,
      matches.date AS match_date,
      matches.start_time AS match_time,
      matches.title AS competition,
      NULL::text AS opponent_name,
      'Participação'::text AS outcome,
      '—'::text AS score_label,
      0::int AS points_gained,
      NULL::int AS rank_position,
      matches.date AS sort_date,
      matches.start_time AS sort_time
    FROM public.match_players
    JOIN public.matches ON matches.id = match_players.match_id
    WHERE match_players.player_id = p_profile_id
      AND match_players.status = 'confirmed'
      AND matches.status = 'finished'
  ) m;

  v_summary := jsonb_build_object(
    'wins', COALESCE(v_profile.vitorias, 0),
    'losses', COALESCE(v_profile.derrotas, 0),
    'games', COALESCE(v_profile.vitorias, 0) + COALESCE(v_profile.derrotas, 0),
    'win_rate',
      CASE
        WHEN COALESCE(v_profile.vitorias, 0) + COALESCE(v_profile.derrotas, 0) > 0
        THEN ROUND(
          COALESCE(v_profile.vitorias, 0)::numeric
          / (COALESCE(v_profile.vitorias, 0) + COALESCE(v_profile.derrotas, 0))::numeric
          * 100
        )
        ELSE 0
      END,
    'points', COALESCE(v_profile.pontos, 0),
    'rank_position', NULL,
    'last_updated', v_profile.updated_at,
    'last_five', '[]'::jsonb,
    'best_set_score', NULL
  );

  RETURN jsonb_build_object('summary', v_summary, 'matches', v_matches);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_player_ranking_details(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_player_ranking_details(UUID) TO authenticated;
