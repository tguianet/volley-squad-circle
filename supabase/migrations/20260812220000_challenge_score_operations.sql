-- Deadlines, reminders, automatic admin escalation and audited score correction.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS score_confirmation_due_at timestamptz,
  ADD COLUMN IF NOT EXISTS score_confirmation_reminder_sent_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_challenge_score_deadline()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'awaiting_confirmation'
     AND NEW.score_registered_at IS DISTINCT FROM OLD.score_registered_at THEN
    NEW.score_confirmation_due_at := now() + interval '24 hours';
    NEW.score_confirmation_reminder_sent_at := NULL;
  ELSIF NEW.status <> 'awaiting_confirmation' THEN
    NEW.score_confirmation_due_at := NULL;
    NEW.score_confirmation_reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_challenge_score_deadline ON public.challenges;
CREATE TRIGGER set_challenge_score_deadline
BEFORE UPDATE OF status, score_registered_at ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.set_challenge_score_deadline();

CREATE OR REPLACE FUNCTION public.process_challenge_score_deadlines()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_reminders integer := 0; v_escalations integer := 0;
BEGIN
  WITH due AS (
    SELECT ch.id, other_captain.user_id
    FROM public.challenges ch
    CROSS JOIN LATERAL (
      SELECT t.captain_id user_id FROM public.teams t
      WHERE t.id IN (ch.challenger_team_id, ch.challenged_team_id)
        AND t.captain_id <> ch.score_registered_by
      LIMIT 1
    ) other_captain
    WHERE ch.status='awaiting_confirmation'
      AND ch.score_confirmation_due_at > now()
      AND ch.score_confirmation_due_at <= now() + interval '6 hours'
      AND ch.score_confirmation_reminder_sent_at IS NULL
  ), inserted AS (
    INSERT INTO public.notifications(user_id,kind,title,body,link_url)
    SELECT user_id,'score_confirmation_reminder','Confirme o placar','O prazo para confirmar o placar termina em menos de 6 horas.','/desafios'
    FROM due RETURNING 1
  ) SELECT count(*) INTO v_reminders FROM inserted;

  UPDATE public.challenges ch
  SET score_confirmation_reminder_sent_at=now()
  WHERE ch.status='awaiting_confirmation'
    AND ch.score_confirmation_due_at > now()
    AND ch.score_confirmation_due_at <= now() + interval '6 hours'
    AND ch.score_confirmation_reminder_sent_at IS NULL;

  WITH escalated AS (
    UPDATE public.challenges ch
    SET score_admin_review_requested_by=COALESCE(ch.score_admin_review_requested_by,ch.score_registered_by),
        score_admin_review_requested_at=COALESCE(ch.score_admin_review_requested_at,now())
    WHERE ch.status='awaiting_confirmation'
      AND ch.score_confirmation_due_at <= now()
      AND ch.score_admin_review_requested_at IS NULL
    RETURNING ch.id
  ), notified AS (
    INSERT INTO public.notifications(user_id,kind,title,body,link_url)
    SELECT ur.user_id,'score_admin_review','Prazo de confirmação vencido','Um placar foi enviado automaticamente para análise.','/admin'
    FROM escalated e CROSS JOIN public.user_roles ur WHERE ur.role='admin'
    RETURNING 1
  ) SELECT count(DISTINCT id) INTO v_escalations FROM escalated;

  RETURN jsonb_build_object('reminders',v_reminders,'escalations',v_escalations);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_correct_challenge_score(
  p_challenge_id uuid,
  p_score_challenger integer,
  p_score_challenged integer
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_challenge public.challenges; v_winner uuid; v_loser uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  IF p_score_challenger < 0 OR p_score_challenged < 0 OR p_score_challenger=p_score_challenged THEN
    RAISE EXCEPTION 'Placar inválido';
  END IF;
  SELECT * INTO v_challenge FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF v_challenge.status <> 'awaiting_confirmation' THEN RAISE EXCEPTION 'Placar não está em análise'; END IF;
  IF p_score_challenger>p_score_challenged THEN v_winner:=v_challenge.challenger_team_id; v_loser:=v_challenge.challenged_team_id;
  ELSE v_winner:=v_challenge.challenged_team_id; v_loser:=v_challenge.challenger_team_id; END IF;
  PERFORM set_config('app.challenge_score_authorized','true',true);
  UPDATE public.challenges SET score_challenger=p_score_challenger,score_challenged=p_score_challenged,
    score_confirmed_by=auth.uid(),score_confirmed_at=now(),winner_team_id=v_winner,loser_team_id=v_loser,status='completed'
  WHERE id=p_challenge_id RETURNING * INTO v_challenge;
  INSERT INTO public.audit_log(actor_id,action,target_type,target_id,payload)
  VALUES(auth.uid(),'challenge.score.admin_correct','challenge',p_challenge_id::text,jsonb_build_object('score_challenger',p_score_challenger,'score_challenged',p_score_challenged));
  RETURN v_challenge;
END;
$$;

REVOKE ALL ON FUNCTION public.process_challenge_score_deadlines() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_challenge_score_deadlines() TO service_role;
REVOKE ALL ON FUNCTION public.admin_correct_challenge_score(uuid,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_correct_challenge_score(uuid,integer,integer) TO authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule(jobid) FROM cron.job WHERE jobname='playbeach-score-deadlines';
    PERFORM cron.schedule('playbeach-score-deadlines','*/15 * * * *','SELECT public.process_challenge_score_deadlines();');
  END IF;
END $$;
