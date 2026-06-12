
-- =====================================================================
-- Podium swap rule + ranks recompute
-- =====================================================================

-- Recompute ranks: keep top 3 as-is, reorder 4+ by points/wins/losses/created_at
CREATE OR REPLACE FUNCTION public.recompute_ranks_below_podium(_category team_category, _gender team_gender)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  pos INT := 4;
BEGIN
  FOR r IN
    SELECT id
    FROM public.teams
    WHERE is_active = true
      AND category = _category
      AND gender = _gender
      AND (rank_position IS NULL OR rank_position >= 4)
    ORDER BY points DESC, wins DESC, losses ASC, created_at ASC
  LOOP
    UPDATE public.teams SET rank_position = pos WHERE id = r.id;
    pos := pos + 1;
  END LOOP;
END;
$$;

-- Bootstrap: assign initial rank_position per (category, gender) where missing/zero
DO $$
DECLARE
  grp RECORD;
  t RECORD;
  pos INT;
BEGIN
  FOR grp IN
    SELECT DISTINCT category, gender FROM public.teams WHERE is_active = true
  LOOP
    -- Only seed if no team in this bucket has a valid rank_position yet
    IF NOT EXISTS (
      SELECT 1 FROM public.teams
      WHERE is_active = true AND category = grp.category AND gender = grp.gender
        AND rank_position IS NOT NULL AND rank_position > 0
    ) THEN
      pos := 1;
      FOR t IN
        SELECT id FROM public.teams
        WHERE is_active = true AND category = grp.category AND gender = grp.gender
        ORDER BY points DESC, wins DESC, losses ASC, created_at ASC
      LOOP
        UPDATE public.teams SET rank_position = pos WHERE id = t.id;
        pos := pos + 1;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- Update challenge status handler with podium swap rule
CREATE OR REPLACE FUNCTION public.handle_challenge_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month DATE;
  v_winner_pos INT;
  v_loser_pos INT;
  v_winner_cat team_category;
  v_winner_gen team_gender;
  v_loser_cat team_category;
  v_loser_gen team_gender;
  v_middle_team UUID;
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

      -- Podium swap rule (only when same category + gender)
      SELECT rank_position, category, gender INTO v_winner_pos, v_winner_cat, v_winner_gen
        FROM public.teams WHERE id = NEW.winner_team_id;
      SELECT rank_position, category, gender INTO v_loser_pos, v_loser_cat, v_loser_gen
        FROM public.teams WHERE id = NEW.loser_team_id;

      IF v_winner_cat = v_loser_cat AND v_winner_gen = v_loser_gen
         AND v_winner_pos IS NOT NULL AND v_loser_pos IS NOT NULL
         AND v_winner_pos > v_loser_pos THEN

        IF v_winner_pos <= 3 THEN
          -- Case B: both inside top 3 — direct swap
          UPDATE public.teams SET rank_position = v_loser_pos WHERE id = NEW.winner_team_id;
          UPDATE public.teams SET rank_position = v_winner_pos WHERE id = NEW.loser_team_id;

        ELSIF v_loser_pos <= 3 THEN
          -- Case A: loser in top 3, winner outside top 3
          -- Loser drops exactly 1 spot (v_loser_pos + 1)
          -- The team currently at (v_loser_pos + 1) moves up to v_winner_pos (fills the hole)
          -- Winner takes v_loser_pos
          IF v_loser_pos + 1 <= 3 THEN
            -- Loser would land on a podium spot currently held by another team:
            -- chain shift among podium + winner.
            -- Example: loser=1 -> goes to 2; old 2 -> goes to 3; old 3 -> goes to v_winner_pos; winner -> 1
            DECLARE
              cur_pos INT := v_loser_pos + 1;
              prev_team UUID := NEW.loser_team_id;
              swap_team UUID;
            BEGIN
              WHILE cur_pos <= 3 LOOP
                SELECT id INTO swap_team FROM public.teams
                  WHERE category = v_winner_cat AND gender = v_winner_gen
                    AND rank_position = cur_pos AND is_active = true
                  LIMIT 1;
                -- shift previous team into cur_pos
                UPDATE public.teams SET rank_position = cur_pos WHERE id = prev_team;
                prev_team := swap_team;
                cur_pos := cur_pos + 1;
                EXIT WHEN swap_team IS NULL;
              END LOOP;
              -- last displaced team (old #3) goes to winner's old position
              IF prev_team IS NOT NULL THEN
                UPDATE public.teams SET rank_position = v_winner_pos WHERE id = prev_team;
              END IF;
              UPDATE public.teams SET rank_position = v_loser_pos WHERE id = NEW.winner_team_id;
            END;
          ELSE
            -- Simple 3-way shift: loser -> v_loser_pos+1, middle team -> v_winner_pos, winner -> v_loser_pos
            SELECT id INTO v_middle_team FROM public.teams
              WHERE category = v_winner_cat AND gender = v_winner_gen
                AND rank_position = v_loser_pos + 1 AND is_active = true
              LIMIT 1;
            UPDATE public.teams SET rank_position = v_loser_pos WHERE id = NEW.winner_team_id;
            UPDATE public.teams SET rank_position = v_loser_pos + 1 WHERE id = NEW.loser_team_id;
            IF v_middle_team IS NOT NULL AND v_middle_team <> NEW.winner_team_id THEN
              UPDATE public.teams SET rank_position = v_winner_pos WHERE id = v_middle_team;
            END IF;
          END IF;
        END IF;
        -- Case C: loser outside top 3 -> no swap
      END IF;

      -- Always recompute below-podium ordering
      IF v_winner_cat IS NOT NULL THEN
        PERFORM public.recompute_ranks_below_podium(v_winner_cat, v_winner_gen);
      END IF;
    END IF;

  ELSIF NEW.status = 'scheduled' THEN
    NEW.responded_at := COALESCE(NEW.responded_at, now());
  END IF;

  RETURN NEW;
END;
$$;

-- Update monthly penalties to recompute ranks afterwards
CREATE OR REPLACE FUNCTION public.apply_monthly_penalties(_month date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT := 0;
  v_team RECORD;
  v_first DATE := date_trunc('month', _month)::DATE;
  v_last DATE := (date_trunc('month', _month) + INTERVAL '1 month - 1 day')::DATE;
  grp RECORD;
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

  FOR grp IN SELECT DISTINCT category, gender FROM public.teams WHERE is_active = true LOOP
    PERFORM public.recompute_ranks_below_podium(grp.category, grp.gender);
  END LOOP;

  RETURN v_count;
END;
$$;
