-- Regras de desafio: validação na inserção e troca direta de posição quando o desafiante vence.

CREATE OR REPLACE FUNCTION public.can_challenge_by_rank(_my_pos INT, _opponent_pos INT)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    _my_pos IS NOT NULL
    AND _opponent_pos IS NOT NULL
    AND _my_pos <> _opponent_pos
    AND (
      (_my_pos BETWEEN 1 AND 5 AND _opponent_pos BETWEEN 1 AND 5)
      OR (_opponent_pos >= _my_pos - 3 AND _opponent_pos <= _my_pos + 2)
    );
$$;

CREATE OR REPLACE FUNCTION public.team_confirmed_member_count(_team_id UUID)
RETURNS INT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.team_members WHERE team_id = _team_id;
$$;

CREATE OR REPLACE FUNCTION public.is_team_ranking_complete(_team_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE t.category
      WHEN 'dupla' THEN public.team_confirmed_member_count(_team_id) = 2
      WHEN 'quarteto' THEN public.team_confirmed_member_count(_team_id) = 4
      ELSE false
    END
  FROM public.teams t
  WHERE t.id = _team_id;
$$;

CREATE OR REPLACE FUNCTION public.validate_challenge_ranking_rules(
  _challenger_team_id UUID,
  _challenged_team_id UUID
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch RECORD;
  v_cd RECORD;
BEGIN
  IF _challenger_team_id = _challenged_team_id THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking.';
  END IF;

  SELECT id, category, gender, rank_position, is_active
    INTO v_ch
    FROM public.teams
    WHERE id = _challenger_team_id;

  SELECT id, category, gender, rank_position, is_active
    INTO v_cd
    FROM public.teams
    WHERE id = _challenged_team_id;

  IF v_ch.id IS NULL OR v_cd.id IS NULL
     OR NOT v_ch.is_active OR NOT v_cd.is_active
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    public.is_team_captain(auth.uid(), NEW.challenger_team_id)
    OR public.has_role(auth.uid(), 'admin')
  ) THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking.';
  END IF;

  PERFORM public.validate_challenge_ranking_rules(
    NEW.challenger_team_id,
    NEW.challenged_team_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_challenge_insert ON public.challenges;
CREATE TRIGGER trg_validate_challenge_insert
  BEFORE INSERT ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_challenge_before_insert();

-- Troca direta de posição quando o desafiante vence; pontos permanecem iguais.
CREATE OR REPLACE FUNCTION public.handle_challenge_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
  v_challenger_pos INT;
  v_challenged_pos INT;
  v_loser_cat team_category;
  v_loser_gen team_gender;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  v_month := date_trunc('month', NEW.scheduled_date)::DATE;

  IF NEW.status = 'declined' THEN
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'declined', -30, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;
    UPDATE public.teams SET points = points - 30 WHERE id = NEW.challenged_team_id;
    NEW.responded_at := COALESCE(NEW.responded_at, now());

    SELECT category, gender INTO v_loser_cat, v_loser_gen
      FROM public.teams WHERE id = NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN
      PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen);
    END IF;

  ELSIF NEW.status = 'wo' THEN
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'walkover', -50, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;
    UPDATE public.teams SET points = points - 50 WHERE id = NEW.challenged_team_id;

    SELECT category, gender INTO v_loser_cat, v_loser_gen
      FROM public.teams WHERE id = NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN
      PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen);
    END IF;

  ELSIF NEW.status = 'completed' THEN
    IF NEW.winner_team_id IS NOT NULL AND NEW.loser_team_id IS NOT NULL THEN
      UPDATE public.teams SET wins = wins + 1, current_streak = current_streak + 1
        WHERE id = NEW.winner_team_id;
      UPDATE public.teams SET losses = losses + 1, current_streak = 0
        WHERE id = NEW.loser_team_id;

      IF NEW.winner_team_id = NEW.challenger_team_id THEN
        SELECT rank_position INTO v_challenger_pos
          FROM public.teams WHERE id = NEW.challenger_team_id;
        SELECT rank_position INTO v_challenged_pos
          FROM public.teams WHERE id = NEW.challenged_team_id;

        IF v_challenger_pos IS NOT NULL AND v_challenged_pos IS NOT NULL THEN
          UPDATE public.teams SET rank_position = v_challenged_pos
            WHERE id = NEW.challenger_team_id;
          UPDATE public.teams SET rank_position = v_challenger_pos
            WHERE id = NEW.challenged_team_id;
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
