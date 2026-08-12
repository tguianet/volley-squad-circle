-- Atomic counterproposals, proposal holds and participant notifications.

CREATE UNIQUE INDEX IF NOT EXISTS challenges_one_reschedule_court_hold
  ON public.challenges(proposed_arena_id, proposed_court_id, proposed_date, proposed_time)
  WHERE status = 'reschedule_requested';

CREATE OR REPLACE FUNCTION public._has_court_conflict(
  p_match_date date,
  p_arena_id uuid,
  p_court_number integer,
  p_start_time time,
  p_end_time time
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_court_number IS NULL OR p_court_number < 1 OR p_court_number > 7 THEN RETURN true; END IF;

  IF EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.date = p_match_date
      AND m.arena_id IS NOT DISTINCT FROM p_arena_id
      AND m.court_number = p_court_number
      AND m.status <> 'cancelled'
      AND p_start_time < public._match_effective_end(m.start_time, m.end_time)
      AND p_end_time > m.start_time
  ) THEN RETURN true; END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenges ch
    JOIN public.courts c ON c.id = ch.court_id
    WHERE ch.scheduled_date = p_match_date
      AND ch.arena_id IS NOT DISTINCT FROM p_arena_id
      AND c.number = p_court_number
      AND ch.status IN ('pending', 'scheduled', 'awaiting_schedule')
      AND ch.scheduled_time IS NOT NULL
      AND p_start_time < (ch.scheduled_time + make_interval(mins => COALESCE(ch.duration_minutes, 60)))::time
      AND p_end_time > ch.scheduled_time
  ) THEN RETURN true; END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenges ch
    JOIN public.courts c ON c.id = ch.proposed_court_id
    WHERE ch.proposed_date = p_match_date
      AND ch.proposed_arena_id IS NOT DISTINCT FROM p_arena_id
      AND c.number = p_court_number
      AND ch.status = 'reschedule_requested'
      AND ch.proposed_time IS NOT NULL
      AND p_start_time < (ch.proposed_time + make_interval(mins => COALESCE(ch.duration_minutes, 60)))::time
      AND p_end_time > ch.proposed_time
  ) THEN RETURN true; END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_pending_challenge_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.challenges
  SET status = 'expired', responded_at = now(), reschedule_reason = 'Convite expirado automaticamente'
  WHERE status IN ('pending', 'reschedule_requested')
    AND invitation_expires_at IS NOT NULL
    AND invitation_expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_challenge_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_challenge_holds() TO service_role;

CREATE OR REPLACE FUNCTION public.propose_challenge_reschedule(
  p_challenge_id uuid,
  p_proposed_date date,
  p_proposed_time time,
  p_proposed_arena_id uuid,
  p_proposed_court_id uuid,
  p_reason text
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge public.challenges;
  v_result public.challenges;
  v_expiration timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para propor reagendamento'; END IF;
  SELECT * INTO v_challenge FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF v_challenge.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_challenge.status <> 'pending' THEN RAISE EXCEPTION 'Este desafio não aceita uma nova contraproposta'; END IF;
  IF NOT public.is_team_captain(auth.uid(), v_challenge.challenged_team_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente o capitão desafiado pode propor reagendamento';
  END IF;
  IF extract(dow FROM p_proposed_date) <> 0 THEN RAISE EXCEPTION 'Desafios só podem ocorrer aos domingos'; END IF;
  IF p_proposed_time < time '08:00' OR p_proposed_time >= time '17:00' THEN
    RAISE EXCEPTION 'Horário fora da janela permitida (08:00 às 17:00)';
  END IF;
  IF length(trim(COALESCE(p_reason,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo do reagendamento'; END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.team_monthly_availability a
    JOIN public.team_monthly_availability b
      ON b.team_id=v_challenge.challenged_team_id AND b.sunday_date=a.sunday_date
    WHERE a.team_id=v_challenge.challenger_team_id
      AND a.sunday_date=p_proposed_date
      AND a.is_available AND b.is_available
      AND a.arena_id=p_proposed_arena_id AND b.arena_id=p_proposed_arena_id
      AND p_proposed_time >= GREATEST(a.time_start,b.time_start)
      AND p_proposed_time + interval '1 hour' <= LEAST(a.time_end,b.time_end)
  ) THEN RAISE EXCEPTION 'Data, horário ou arena fora da disponibilidade comum'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courts WHERE id=p_proposed_court_id AND is_active) THEN
    RAISE EXCEPTION 'Quadra inválida ou inativa';
  END IF;

  PERFORM public.expire_pending_challenge_holds();
  PERFORM pg_advisory_xact_lock(hashtext(
    p_proposed_arena_id::text || ':' || p_proposed_court_id::text || ':' ||
    p_proposed_date::text || ':' || p_proposed_time::text
  ));
  IF EXISTS (
    SELECT 1 FROM public.challenges ch
    WHERE ch.id<>p_challenge_id AND (
      (ch.status IN ('pending','scheduled') AND ch.arena_id=p_proposed_arena_id
       AND ch.court_id=p_proposed_court_id AND ch.scheduled_date=p_proposed_date
       AND ch.scheduled_time=p_proposed_time)
      OR
      (ch.status='reschedule_requested' AND ch.proposed_arena_id=p_proposed_arena_id
       AND ch.proposed_court_id=p_proposed_court_id AND ch.proposed_date=p_proposed_date
       AND ch.proposed_time=p_proposed_time)
    )
  ) THEN RAISE EXCEPTION 'Esta quadra já está pré-bloqueada nesse horário'; END IF;

  v_expiration := LEAST(now()+interval '24 hours', p_proposed_date::timestamp+p_proposed_time-interval '24 hours');
  IF v_expiration<=now() THEN RAISE EXCEPTION 'A contraproposta precisa de ao menos 24 horas de antecedência'; END IF;

  UPDATE public.challenges
  SET status='reschedule_requested', proposed_date=p_proposed_date, proposed_time=p_proposed_time,
      proposed_arena_id=p_proposed_arena_id, proposed_court_id=p_proposed_court_id,
      reschedule_proposed_by=auth.uid(), reschedule_reason=trim(p_reason),
      invitation_expires_at=v_expiration, held_at=now(), responded_at=now()
  WHERE id=p_challenge_id AND status='pending'
  RETURNING * INTO v_result;
  IF v_result.id IS NULL THEN RAISE EXCEPTION 'Este desafio já possui uma contraproposta ativa'; END IF;
  RETURN v_result;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Esta quadra já está pré-bloqueada nesse horário';
END;
$$;

REVOKE ALL ON FUNCTION public.propose_challenge_reschedule(uuid,date,time,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.propose_challenge_reschedule(uuid,date,time,uuid,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_challenge_reschedule(p_challenge_id uuid, p_action text)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_challenge public.challenges;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para responder ao reagendamento'; END IF;
  IF p_action NOT IN ('accept','decline') THEN RAISE EXCEPTION 'Resposta de reagendamento inválida'; END IF;
  SELECT * INTO v_challenge FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF v_challenge.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_challenge.status<>'reschedule_requested' THEN RAISE EXCEPTION 'Não existe contraproposta ativa'; END IF;
  IF NOT public.is_team_captain(auth.uid(),v_challenge.challenger_team_id)
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Somente o capitão desafiante pode responder à contraproposta';
  END IF;
  IF v_challenge.invitation_expires_at IS NULL OR v_challenge.invitation_expires_at<=now() THEN
    UPDATE public.challenges SET status='expired',responded_at=now() WHERE id=p_challenge_id RETURNING * INTO v_challenge;
    RETURN v_challenge;
  END IF;
  IF p_action='accept' THEN
    UPDATE public.challenges
    SET status='scheduled', scheduled_date=proposed_date, scheduled_time=proposed_time,
        arena_id=proposed_arena_id, court_id=proposed_court_id, responded_at=now(),
        proposed_date=NULL, proposed_time=NULL, proposed_arena_id=NULL, proposed_court_id=NULL,
        reschedule_proposed_by=NULL
    WHERE id=p_challenge_id AND status='reschedule_requested'
    RETURNING * INTO v_challenge;
  ELSE
    UPDATE public.challenges SET status='cancelled',responded_at=now()
    WHERE id=p_challenge_id AND status='reschedule_requested'
    RETURNING * INTO v_challenge;
  END IF;
  RETURN v_challenge;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_challenge_reschedule(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_challenge_reschedule(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_challenge_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_title text; v_body text; v_kind text;
BEGIN
  IF TG_OP='INSERT' AND NEW.status='pending' THEN
    v_kind:='challenge_invite'; v_title:='Novo desafio recebido';
    v_body:='Sua equipe recebeu um novo desafio. Confira a data e o horário.';
  ELSIF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'scheduled' THEN v_kind:='challenge_accepted'; v_title:='Desafio confirmado'; v_body:='A reserva do desafio foi confirmada.';
      WHEN 'declined' THEN v_kind:='challenge_declined'; v_title:='Desafio recusado'; v_body:='O desafio foi recusado e a quadra foi liberada.';
      WHEN 'reschedule_requested' THEN v_kind:='challenge_reschedule_requested'; v_title:='Novo horário proposto'; v_body:='Uma contraproposta de data e horário aguarda resposta.';
      WHEN 'cancelled' THEN v_kind:='challenge_reschedule_declined'; v_title:='Contraproposta recusada'; v_body:='A contraproposta foi recusada e a quadra foi liberada.';
      WHEN 'expired' THEN v_kind:='challenge_expired'; v_title:='Convite expirado'; v_body:='O prazo terminou e a quadra foi liberada.';
      ELSE RETURN NEW;
    END CASE;
  ELSE RETURN NEW;
  END IF;

  INSERT INTO public.notifications(user_id,kind,title,body,link_url,created_by)
  SELECT participant.user_id,v_kind,v_title,v_body,'/desafios',auth.uid()
  FROM (
    SELECT tm.profile_id user_id FROM public.team_members tm
    WHERE tm.team_id IN (NEW.challenger_team_id,NEW.challenged_team_id)
    UNION
    SELECT t.captain_id FROM public.teams t
    WHERE t.id IN (NEW.challenger_team_id,NEW.challenged_team_id)
  ) participant;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_challenge_participants ON public.challenges;
CREATE TRIGGER notify_challenge_participants
AFTER INSERT OR UPDATE OF status ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.notify_challenge_participants();

REVOKE ALL ON FUNCTION public.notify_challenge_participants() FROM PUBLIC, anon, authenticated;
