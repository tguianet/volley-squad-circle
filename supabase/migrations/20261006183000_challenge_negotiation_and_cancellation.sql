-- Simplifies challenge scheduling/negotiation and adds cancellation policy.
-- Initial invite no longer requires pre-filled team availability.
-- Captains can counter-propose up to 3 times each before agreement.
-- Scheduled-game cancellation policy:
--   weather / arena unavailable: no penalty
--   >24h: 0 points
--   6-24h: -10 points
--   <6h: -20 points
-- After kickoff, cancellation is blocked; W.O. flow must be used.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS challenger_proposal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS challenged_proposal_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancellation_note text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_penalty integer;

CREATE OR REPLACE FUNCTION public.create_challenge_with_hold(
  p_challenger_team_id uuid,
  p_challenged_team_id uuid,
  p_scheduled_date date,
  p_scheduled_time time,
  p_arena_id uuid,
  p_court_id uuid
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  IF (p_scheduled_date + p_scheduled_time) AT TIME ZONE 'America/Sao_Paulo' <= now() + interval '24 hours' THEN
    RAISE EXCEPTION 'O convite precisa ser enviado com ao menos 24 horas de antecedência';
  END IF;

  SELECT * INTO v_challenger FROM public.teams WHERE id=p_challenger_team_id FOR UPDATE;
  SELECT * INTO v_challenged FROM public.teams WHERE id=p_challenged_team_id FOR UPDATE;

  IF v_challenger.id IS NULL OR v_challenged.id IS NULL THEN RAISE EXCEPTION 'Equipe não encontrada'; END IF;
  IF v_challenger.captain_id <> auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Somente o capitão pode criar desafios';
  END IF;
  IF NOT v_challenger.is_active OR NOT v_challenged.is_active
     OR v_challenger.category <> v_challenged.category
     OR v_challenger.gender <> v_challenged.gender
     OR NOT public.can_challenge_by_rank(v_challenger.rank_position,v_challenged.rank_position) THEN
    RAISE EXCEPTION 'Desafio inválido pelas regras do ranking';
  END IF;

  v_required_members := CASE WHEN v_challenger.category='dupla' THEN 2 ELSE 4 END;
  IF (SELECT count(*) FROM public.team_members WHERE team_id=v_challenger.id) <> v_required_members
     OR (SELECT count(*) FROM public.team_members WHERE team_id=v_challenged.id) <> v_required_members THEN
    RAISE EXCEPTION 'As duas equipes precisam estar completas';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.arenas WHERE id=p_arena_id AND is_active) THEN
    RAISE EXCEPTION 'Arena inválida ou inativa';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courts WHERE id=p_court_id AND is_active) THEN
    RAISE EXCEPTION 'Quadra inválida ou inativa';
  END IF;

  PERFORM public.expire_pending_challenge_holds();
  PERFORM pg_advisory_xact_lock(hashtext(
    p_arena_id::text || ':' || p_court_id::text || ':' ||
    p_scheduled_date::text || ':' || p_scheduled_time::text
  ));
  PERFORM pg_advisory_xact_lock(hashtext(
    LEAST(p_challenger_team_id,p_challenged_team_id)::text || ':' ||
    GREATEST(p_challenger_team_id,p_challenged_team_id)::text
  ));

  IF public._has_court_conflict(
    NULL,p_arena_id,p_court_id,p_scheduled_date,p_scheduled_time
  ) THEN
    RAISE EXCEPTION 'Esta quadra já está reservada nesse horário';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.challenges
    WHERE LEAST(challenger_team_id,challenged_team_id)=LEAST(p_challenger_team_id,p_challenged_team_id)
      AND GREATEST(challenger_team_id,challenged_team_id)=GREATEST(p_challenger_team_id,p_challenged_team_id)
      AND status IN ('pending','scheduled','reschedule_requested')
  ) THEN
    RAISE EXCEPTION 'Estas equipes já possuem um desafio ativo';
  END IF;

  v_expiration := LEAST(
    now()+interval '24 hours',
    ((p_scheduled_date+p_scheduled_time) AT TIME ZONE 'America/Sao_Paulo')-interval '24 hours'
  );

  INSERT INTO public.challenges(
    challenger_team_id,challenged_team_id,scheduled_date,scheduled_time,
    arena_id,court_id,status,created_by,held_at,invitation_expires_at,
    challenger_proposal_count
  )
  VALUES(
    p_challenger_team_id,p_challenged_team_id,p_scheduled_date,p_scheduled_time,
    p_arena_id,p_court_id,'pending',auth.uid(),now(),v_expiration,1
  )
  RETURNING * INTO v_result;

  RETURN v_result;
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'A quadra ou uma das equipes já possui um desafio ativo nesse período';
END;
$$;

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
  v_ch public.challenges;
  v_result public.challenges;
  v_is_challenger boolean;
  v_is_challenged boolean;
  v_expiration timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para propor outro horário'; END IF;

  SELECT * INTO v_ch FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF v_ch.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_ch.status NOT IN ('pending','reschedule_requested') THEN
    RAISE EXCEPTION 'Este desafio não aceita contraproposta';
  END IF;

  v_is_challenger := public.is_team_captain(auth.uid(),v_ch.challenger_team_id);
  v_is_challenged := public.is_team_captain(auth.uid(),v_ch.challenged_team_id);

  IF NOT v_is_challenger AND NOT v_is_challenged AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Somente os capitães envolvidos podem propor outro horário';
  END IF;

  IF v_ch.status='pending' AND NOT v_is_challenged AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'A primeira contraproposta deve ser feita pelo time desafiado';
  END IF;

  IF v_ch.status='reschedule_requested'
     AND v_ch.reschedule_proposed_by=auth.uid()
     AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Aguarde a resposta do outro capitão';
  END IF;

  IF v_is_challenger AND v_ch.challenger_proposal_count >= 3 THEN
    RAISE EXCEPTION 'Seu time já atingiu o limite de 3 propostas de horário';
  END IF;
  IF v_is_challenged AND v_ch.challenged_proposal_count >= 3 THEN
    RAISE EXCEPTION 'Seu time já atingiu o limite de 3 propostas de horário';
  END IF;

  IF extract(dow from p_proposed_date) <> 0 THEN RAISE EXCEPTION 'Desafios só podem ocorrer aos domingos'; END IF;
  IF p_proposed_time < time '08:00' OR p_proposed_time >= time '17:00' THEN
    RAISE EXCEPTION 'Horário fora da janela permitida (08:00 às 17:00)';
  END IF;
  IF ((p_proposed_date+p_proposed_time) AT TIME ZONE 'America/Sao_Paulo') <= now()+interval '24 hours' THEN
    RAISE EXCEPTION 'A proposta precisa ter ao menos 24 horas de antecedência';
  END IF;
  IF length(trim(coalesce(p_reason,''))) < 3 THEN RAISE EXCEPTION 'Informe o motivo da contraproposta'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.arenas WHERE id=p_proposed_arena_id AND is_active) THEN
    RAISE EXCEPTION 'Arena inválida ou inativa';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.courts WHERE id=p_proposed_court_id AND is_active) THEN
    RAISE EXCEPTION 'Quadra inválida ou inativa';
  END IF;

  PERFORM public.expire_pending_challenge_holds();
  PERFORM pg_advisory_xact_lock(hashtext(
    p_proposed_arena_id::text || ':' || p_proposed_court_id::text || ':' ||
    p_proposed_date::text || ':' || p_proposed_time::text
  ));

  IF public._has_court_conflict(
    p_challenge_id,p_proposed_arena_id,p_proposed_court_id,p_proposed_date,p_proposed_time
  ) THEN
    RAISE EXCEPTION 'Esta quadra já está reservada nesse horário';
  END IF;

  v_expiration := LEAST(
    now()+interval '24 hours',
    ((p_proposed_date+p_proposed_time) AT TIME ZONE 'America/Sao_Paulo')-interval '24 hours'
  );

  UPDATE public.challenges
  SET status='reschedule_requested',
      proposed_date=p_proposed_date,
      proposed_time=p_proposed_time,
      proposed_arena_id=p_proposed_arena_id,
      proposed_court_id=p_proposed_court_id,
      reschedule_proposed_by=auth.uid(),
      reschedule_reason=trim(p_reason),
      invitation_expires_at=v_expiration,
      held_at=now(),
      responded_at=now(),
      challenger_proposal_count=challenger_proposal_count + CASE WHEN v_is_challenger THEN 1 ELSE 0 END,
      challenged_proposal_count=challenged_proposal_count + CASE WHEN v_is_challenged THEN 1 ELSE 0 END
  WHERE id=p_challenge_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_challenge_reschedule(
  p_challenge_id uuid,
  p_action text
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.challenges;
  v_result public.challenges;
  v_is_challenger boolean;
  v_is_challenged boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para responder'; END IF;
  IF p_action NOT IN ('accept','decline') THEN RAISE EXCEPTION 'Resposta inválida'; END IF;

  SELECT * INTO v_ch FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF v_ch.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_ch.status<>'reschedule_requested' THEN RAISE EXCEPTION 'Não existe contraproposta ativa'; END IF;

  v_is_challenger := public.is_team_captain(auth.uid(),v_ch.challenger_team_id);
  v_is_challenged := public.is_team_captain(auth.uid(),v_ch.challenged_team_id);

  IF NOT v_is_challenger AND NOT v_is_challenged AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Somente os capitães envolvidos podem responder';
  END IF;
  IF v_ch.reschedule_proposed_by=auth.uid() AND NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'A contraproposta deve ser respondida pelo outro capitão';
  END IF;

  IF p_action='accept' THEN
    UPDATE public.challenges
    SET status='scheduled',
        scheduled_date=proposed_date,
        scheduled_time=proposed_time,
        arena_id=proposed_arena_id,
        court_id=proposed_court_id,
        responded_at=now(),
        proposed_date=NULL,
        proposed_time=NULL,
        proposed_arena_id=NULL,
        proposed_court_id=NULL,
        reschedule_proposed_by=NULL
    WHERE id=p_challenge_id
    RETURNING * INTO v_result;
  ELSE
    UPDATE public.challenges
    SET status='cancelled',
        responded_at=now(),
        cancellation_reason='no_schedule_agreement',
        cancellation_note='Contraproposta recusada; desafio encerrado sem acordo de agenda.',
        cancelled_by=auth.uid(),
        cancelled_at=now(),
        cancellation_penalty=0
    WHERE id=p_challenge_id
    RETURNING * INTO v_result;
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_scheduled_challenge(
  p_challenge_id uuid,
  p_reason text,
  p_note text DEFAULT NULL
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.challenges;
  v_result public.challenges;
  v_team_id uuid;
  v_kickoff timestamptz;
  v_hours numeric;
  v_penalty integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para cancelar o jogo'; END IF;
  IF p_reason NOT IN ('weather','arena_unavailable','injury','personal','other') THEN
    RAISE EXCEPTION 'Motivo de cancelamento inválido';
  END IF;

  SELECT * INTO v_ch FROM public.challenges WHERE id=p_challenge_id FOR UPDATE;
  IF v_ch.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_ch.status<>'scheduled' THEN RAISE EXCEPTION 'Somente jogos confirmados podem ser cancelados'; END IF;

  IF public.is_team_captain(auth.uid(),v_ch.challenger_team_id) THEN
    v_team_id := v_ch.challenger_team_id;
  ELSIF public.is_team_captain(auth.uid(),v_ch.challenged_team_id) THEN
    v_team_id := v_ch.challenged_team_id;
  ELSIF public.has_role(auth.uid(),'admin') THEN
    v_team_id := NULL;
  ELSE
    RAISE EXCEPTION 'Somente os capitães envolvidos podem cancelar';
  END IF;

  v_kickoff := (v_ch.scheduled_date+v_ch.scheduled_time) AT TIME ZONE 'America/Sao_Paulo';
  IF v_kickoff <= now() THEN
    RAISE EXCEPTION 'O jogo já começou. Use o fluxo de W.O. quando necessário';
  END IF;

  v_hours := extract(epoch from (v_kickoff-now()))/3600.0;

  IF p_reason IN ('weather','arena_unavailable') OR v_team_id IS NULL THEN
    v_penalty := 0;
  ELSIF v_hours > 24 THEN
    v_penalty := 0;
  ELSIF v_hours >= 6 THEN
    v_penalty := -10;
  ELSE
    v_penalty := -20;
  END IF;

  IF v_penalty < 0 AND v_team_id IS NOT NULL THEN
    UPDATE public.teams SET points=points+v_penalty WHERE id=v_team_id;
  END IF;

  UPDATE public.challenges
  SET status='cancelled',
      cancellation_reason=p_reason,
      cancellation_note=nullif(trim(coalesce(p_note,'')),''),
      cancelled_by=auth.uid(),
      cancelled_at=now(),
      cancellation_penalty=v_penalty,
      responded_at=now()
  WHERE id=p_challenge_id
  RETURNING * INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.create_challenge_with_hold(uuid,uuid,date,time,uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_challenge_with_hold(uuid,uuid,date,time,uuid,uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.propose_challenge_reschedule(uuid,date,time,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_challenge_reschedule(uuid,date,time,uuid,uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.respond_to_challenge_reschedule(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.respond_to_challenge_reschedule(uuid,text) TO authenticated;
REVOKE ALL ON FUNCTION public.cancel_scheduled_challenge(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cancel_scheduled_challenge(uuid,text,text) TO authenticated;

NOTIFY pgrst,'reload schema';
