-- Align PlayBeach challenge eligibility and team scoring with the official rules.
-- Challenge window: up to 5 positions above and 2 positions below.
-- Team score: match +5; win +15; 2x0 win +20 instead of +15; each 5-win streak +25.
-- Penalties: valid refusal -30; W.O. -50; no challenge in the month -20.

CREATE OR REPLACE FUNCTION public.can_challenge_by_rank(my_position integer, opponent_position integer)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN my_position IS NULL OR opponent_position IS NULL THEN false
    WHEN my_position = opponent_position THEN false
    WHEN my_position BETWEEN 1 AND 5 AND opponent_position BETWEEN 1 AND 5 THEN true
    ELSE opponent_position >= my_position - 5 AND opponent_position <= my_position + 2
  END;
$function$


CREATE OR REPLACE FUNCTION public.create_challenge_with_hold(p_challenger_team_id uuid, p_challenged_team_id uuid, p_scheduled_date date, p_scheduled_time time without time zone, p_arena_id uuid, p_court_id uuid)
 RETURNS challenges
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenger public.teams;
  v_challenged public.teams;
  v_result public.challenges;
  v_expiration timestamptz;
  v_required_members integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para criar um desafio'; END IF;
  IF extract(dow from p_scheduled_date) <> 0 THEN
    RAISE EXCEPTION 'Desafios só podem ser marcados aos domingos';
  END IF;
  IF p_scheduled_time < time '08:00' OR p_scheduled_time >= time '17:00' THEN
    RAISE EXCEPTION 'Horário fora da janela permitida (08:00 às 17:00)';
  END IF;
  IF p_scheduled_date::timestamp + p_scheduled_time <= now() THEN
    RAISE EXCEPTION 'Escolha uma data futura';
  END IF;

  SELECT * INTO v_challenger FROM public.teams WHERE id = p_challenger_team_id FOR UPDATE;
  SELECT * INTO v_challenged FROM public.teams WHERE id = p_challenged_team_id FOR UPDATE;
  IF v_challenger.id IS NULL OR v_challenged.id IS NULL THEN RAISE EXCEPTION 'Equipe não encontrada'; END IF;
  IF v_challenger.captain_id <> auth.uid() AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente o capitão pode criar desafios';
  END IF;
  IF NOT v_challenger.is_active OR NOT v_challenged.is_active
     OR v_challenger.category <> v_challenged.category
     OR v_challenger.gender <> v_challenged.gender THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking';
  END IF;
  IF v_challenger.rank_position IS NULL OR v_challenged.rank_position IS NULL
     OR (v_challenger.rank_position <= 5 AND v_challenged.rank_position > 5)
     OR (v_challenger.rank_position > 5 AND (
       v_challenged.rank_position < v_challenger.rank_position - 5
       OR v_challenged.rank_position > v_challenger.rank_position + 2
     )) THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking';
  END IF;
  v_required_members := CASE WHEN v_challenger.category = 'dupla' THEN 2 ELSE 4 END;
  IF (SELECT count(*) FROM public.team_members WHERE team_id = v_challenger.id) <> v_required_members
     OR (SELECT count(*) FROM public.team_members WHERE team_id = v_challenged.id) <> v_required_members THEN
    RAISE EXCEPTION 'As duas equipes precisam estar completas';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.team_monthly_availability a
    JOIN public.team_monthly_availability b
      ON b.team_id = p_challenged_team_id
     AND b.sunday_date = a.sunday_date
    WHERE a.team_id = p_challenger_team_id
      AND a.sunday_date = p_scheduled_date
      AND a.is_available AND b.is_available
      AND a.arena_id = p_arena_id AND b.arena_id = p_arena_id
      AND p_scheduled_time >= GREATEST(a.time_start, b.time_start)
      AND p_scheduled_time + interval '1 hour' <= LEAST(a.time_end, b.time_end)
  ) THEN
    RAISE EXCEPTION 'Data, horário ou arena fora da disponibilidade comum';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courts WHERE id = p_court_id AND is_active) THEN
    RAISE EXCEPTION 'Quadra inválida ou inativa';
  END IF;

  PERFORM public.expire_pending_challenge_holds();
  PERFORM pg_advisory_xact_lock(
    hashtext(p_arena_id::text || ':' || p_court_id::text || ':' || p_scheduled_date::text || ':' || p_scheduled_time::text)
  );
  PERFORM pg_advisory_xact_lock(
    hashtext(
      LEAST(p_challenger_team_id, p_challenged_team_id)::text || ':' ||
      GREATEST(p_challenger_team_id, p_challenged_team_id)::text
    )
  );
  IF EXISTS (
    SELECT 1 FROM public.challenges
    WHERE arena_id = p_arena_id
      AND court_id = p_court_id
      AND scheduled_date = p_scheduled_date
      AND scheduled_time = p_scheduled_time
      AND status IN ('pending', 'scheduled')
  ) THEN
    RAISE EXCEPTION 'Esta quadra já está reservada nesse horário';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.challenges
    WHERE LEAST(challenger_team_id, challenged_team_id) = LEAST(p_challenger_team_id, p_challenged_team_id)
      AND GREATEST(challenger_team_id, challenged_team_id) = GREATEST(p_challenger_team_id, p_challenged_team_id)
      AND status IN ('pending', 'scheduled', 'reschedule_requested')
  ) THEN
    RAISE EXCEPTION 'Estas equipes já possuem um desafio ativo';
  END IF;
  v_expiration := LEAST(
    now() + interval '24 hours',
    p_scheduled_date::timestamp + p_scheduled_time - interval '24 hours'
  );
  IF v_expiration <= now() THEN RAISE EXCEPTION 'O convite precisa ser enviado com ao menos 24 horas de antecedência'; END IF;

  INSERT INTO public.challenges (
    challenger_team_id, challenged_team_id, scheduled_date, scheduled_time,
    arena_id, court_id, status, created_by, held_at, invitation_expires_at
  ) VALUES (
    p_challenger_team_id, p_challenged_team_id, p_scheduled_date, p_scheduled_time,
    p_arena_id, p_court_id, 'pending', auth.uid(), now(), v_expiration
  ) RETURNING * INTO v_result;
  RETURN v_result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'A quadra ou uma das equipes já possui um desafio ativo nesse período';
END;
$function$


CREATE OR REPLACE FUNCTION public.handle_challenge_status_change()
 RETURNS trigger
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
  v_winner_streak INT;
  v_win_bonus INT;
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
    UPDATE public.teams
      SET wo_count = wo_count + 1,
          points = points - 50
      WHERE id = NEW.challenged_team_id;

    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'walkover', -50, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;

    SELECT category, gender INTO v_loser_cat, v_loser_gen
      FROM public.teams WHERE id=NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN
      PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen);
    END IF;

    INSERT INTO public.notifications (user_id, kind, title, body, link_url)
    SELECT t.captain_id, 'wo_penalty',
      'W.O. registrado (-50 pts)',
      'Sua equipe ' || t.name || ' recebeu penalidade de 50 pontos por W.O.',
      '/desafios'
    FROM public.teams t WHERE t.id = NEW.challenged_team_id;

  ELSIF NEW.status='completed' THEN
    IF NEW.winner_team_id IS NOT NULL AND NEW.loser_team_id IS NOT NULL THEN
      UPDATE public.teams
        SET wins=wins+1, current_streak=current_streak+1
        WHERE id=NEW.winner_team_id
        RETURNING current_streak INTO v_winner_streak;

      UPDATE public.teams
        SET losses=losses+1, current_streak=0, points=points+5
        WHERE id=NEW.loser_team_id;

      v_win_bonus := CASE
        WHEN GREATEST(COALESCE(NEW.score_challenger,0), COALESCE(NEW.score_challenged,0)) = 2
         AND LEAST(COALESCE(NEW.score_challenger,0), COALESCE(NEW.score_challenged,0)) = 0
        THEN 20
        ELSE 15
      END;

      UPDATE public.teams
        SET points = points + 5 + v_win_bonus
        WHERE id=NEW.winner_team_id;

      IF v_winner_streak > 0 AND mod(v_winner_streak, 5) = 0 THEN
        UPDATE public.teams SET points = points + 25 WHERE id=NEW.winner_team_id;
      END IF;

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
$function$


NOTIFY pgrst, 'reload schema';
