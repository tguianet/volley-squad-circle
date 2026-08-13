\set ON_ERROR_STOP on

-- Homologates the complete score lifecycle without persisting test data.
BEGIN;

DO $stage7$
DECLARE
  v_challenge_id uuid := gen_random_uuid();
  v_challenger uuid;
  v_challenged uuid;
  v_cap1 uuid;
  v_cap2 uuid;
  v_row public.challenges;
  v_deadline jsonb;
BEGIN
  WITH complete_teams AS (
    SELECT t.id, t.captain_id, t.category, t.gender, t.rank_position,
      row_number() OVER (
        PARTITION BY t.category, t.gender
        ORDER BY t.rank_position NULLS LAST, t.created_at
      ) AS position
    FROM public.teams t
    JOIN public.team_members tm ON tm.team_id = t.id
    WHERE t.is_active
    GROUP BY t.id
    HAVING public.is_team_ranking_complete(t.category::text, count(tm.profile_id)::integer)
  )
  SELECT first_team.id, second_team.id, first_team.captain_id, second_team.captain_id
    INTO v_challenger, v_challenged, v_cap1, v_cap2
    FROM complete_teams first_team
    JOIN complete_teams second_team
      ON second_team.category = first_team.category
     AND second_team.gender = first_team.gender
     AND second_team.position = first_team.position + 1
     AND second_team.captain_id <> first_team.captain_id
   ORDER BY first_team.position
   LIMIT 1;

  IF v_challenger IS NULL OR v_challenged IS NULL THEN
    RAISE EXCEPTION 'stage7: duas equipes completas e compatíveis não foram encontradas';
  END IF;

  INSERT INTO public.challenges (
    id, challenger_team_id, challenged_team_id, scheduled_date, scheduled_time,
    status, created_by, responded_at
  ) VALUES (
    v_challenge_id, v_challenger, v_challenged, current_date - 1, '12:00:00',
    'scheduled', v_cap1, now()
  );

  PERFORM set_config('request.jwt.claim.sub', v_cap1::text, true);
  SELECT * INTO v_row FROM public.register_challenge_score(v_challenge_id, 21, 17);
  IF v_row.status::text <> 'awaiting_confirmation'
     OR v_row.score_registered_by <> v_cap1
     OR v_row.score_confirmation_due_at IS NULL THEN
    RAISE EXCEPTION 'stage7: registro de placar inválido';
  END IF;

  UPDATE public.challenges
     SET score_confirmation_due_at = now() + interval '5 hours',
         score_confirmation_reminder_sent_at = null
   WHERE id = v_challenge_id;
  SELECT public.process_challenge_score_deadlines() INTO v_deadline;
  SELECT * INTO v_row FROM public.challenges WHERE id = v_challenge_id;
  IF v_row.score_confirmation_reminder_sent_at IS NULL THEN
    RAISE EXCEPTION 'stage7: lembrete não processado: %', v_deadline;
  END IF;

  UPDATE public.challenges
     SET score_confirmation_due_at = now() - interval '1 minute',
         score_admin_review_requested_at = null,
         score_admin_review_requested_by = null
   WHERE id = v_challenge_id;
  SELECT public.process_challenge_score_deadlines() INTO v_deadline;
  SELECT * INTO v_row FROM public.challenges WHERE id = v_challenge_id;
  IF v_row.score_admin_review_requested_at IS NULL THEN
    RAISE EXCEPTION 'stage7: escalada ao ADM não processada: %', v_deadline;
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_cap2::text, true);
  SELECT * INTO v_row FROM public.reject_challenge_score(v_challenge_id);
  IF v_row.status::text <> 'scheduled'
     OR v_row.score_challenger IS NOT NULL
     OR v_row.score_challenged IS NOT NULL
     OR v_row.winner_team_id IS NOT NULL
     OR v_row.loser_team_id IS NOT NULL THEN
    RAISE EXCEPTION 'stage7: rejeição não limpou o placar';
  END IF;

  PERFORM set_config('request.jwt.claim.sub', v_cap1::text, true);
  PERFORM public.register_challenge_score(v_challenge_id, 18, 21);

  PERFORM set_config('request.jwt.claim.sub', v_cap2::text, true);
  SELECT * INTO v_row FROM public.confirm_challenge_score(v_challenge_id);
  IF v_row.status::text <> 'completed'
     OR v_row.winner_team_id <> v_challenged
     OR v_row.loser_team_id <> v_challenger
     OR v_row.score_confirmed_by <> v_cap2 THEN
    RAISE EXCEPTION 'stage7: confirmação, vencedor ou perdedor inválido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
     WHERE user_id = v_cap2 AND kind = 'score_pending'
       AND created_at >= now() - interval '1 minute'
  ) THEN
    RAISE EXCEPTION 'stage7: notificação de placar pendente ausente';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.notifications
     WHERE user_id IN (v_cap1, v_cap2) AND kind = 'score_confirmed'
       AND created_at >= now() - interval '1 minute'
  ) THEN
    RAISE EXCEPTION 'stage7: notificação de placar confirmado ausente';
  END IF;

  RAISE NOTICE 'stage7 passed: score lifecycle and notifications validated';
END
$stage7$;

ROLLBACK;
