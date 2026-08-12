-- Atomic challenge invitation, availability validation and temporary court holds.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS invitation_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS proposed_date date,
  ADD COLUMN IF NOT EXISTS proposed_time time,
  ADD COLUMN IF NOT EXISTS proposed_arena_id uuid REFERENCES public.arenas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_court_id uuid REFERENCES public.courts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reschedule_proposed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

UPDATE public.challenges
SET held_at = COALESCE(held_at, created_at),
    invitation_expires_at = LEAST(
      COALESCE(invitation_expires_at, created_at + interval '24 hours'),
      scheduled_date::timestamp + scheduled_time - interval '24 hours'
    )
WHERE status = 'pending'
  AND scheduled_date IS NOT NULL
  AND scheduled_time IS NOT NULL;

-- Preserve legacy duplicates but release every older hold before adding uniqueness.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY arena_id, court_id, scheduled_date, scheduled_time
           ORDER BY (status = 'scheduled') DESC, created_at DESC, id DESC
         ) AS position
  FROM public.challenges
  WHERE status IN ('pending', 'scheduled')
)
UPDATE public.challenges challenge
SET status = 'expired', reschedule_reason = 'Pré-bloqueio antigo duplicado'
FROM ranked
WHERE challenge.id = ranked.id AND ranked.position > 1 AND challenge.status <> 'scheduled';

WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY LEAST(challenger_team_id, challenged_team_id),
                        GREATEST(challenger_team_id, challenged_team_id)
           ORDER BY (status = 'scheduled') DESC, created_at DESC, id DESC
         ) AS position
  FROM public.challenges
  WHERE status IN ('pending', 'scheduled', 'reschedule_requested')
)
UPDATE public.challenges challenge
SET status = 'expired', reschedule_reason = 'Desafio ativo antigo duplicado'
FROM ranked
WHERE challenge.id = ranked.id AND ranked.position > 1 AND challenge.status <> 'scheduled';

CREATE INDEX IF NOT EXISTS idx_challenges_pending_expiration
  ON public.challenges(invitation_expires_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS challenges_one_active_court_hold
  ON public.challenges(arena_id, court_id, scheduled_date, scheduled_time)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS challenges_one_active_team_pair
  ON public.challenges(
    LEAST(challenger_team_id, challenged_team_id),
    GREATEST(challenger_team_id, challenged_team_id)
  )
  WHERE status IN ('pending', 'reschedule_requested');

CREATE OR REPLACE FUNCTION public.expire_pending_challenge_holds()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.challenges
  SET status = 'expired',
      responded_at = now(),
      reschedule_reason = 'Convite expirado automaticamente'
  WHERE status = 'pending'
    AND invitation_expires_at IS NOT NULL
    AND invitation_expires_at <= now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expire_pending_challenge_holds() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_pending_challenge_holds() TO service_role;

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
       v_challenged.rank_position < v_challenger.rank_position - 3
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
$$;

REVOKE ALL ON FUNCTION public.create_challenge_with_hold(uuid, uuid, date, time, uuid, uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_challenge_with_hold(uuid, uuid, date, time, uuid, uuid)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.respond_to_challenge_invitation(
  p_challenge_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge public.challenges;
  v_next_status public.challenge_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Faça login para responder ao desafio'; END IF;
  IF p_action NOT IN ('accept', 'decline', 'reschedule') THEN
    RAISE EXCEPTION 'Resposta de desafio inválida';
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
  FOR UPDATE;

  IF v_challenge.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_challenge.status <> 'pending' THEN RAISE EXCEPTION 'Este desafio não está mais pendente'; END IF;
  IF NOT public.is_team_captain(auth.uid(), v_challenge.challenged_team_id)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Somente o capitão pode responder ao desafio';
  END IF;

  IF v_challenge.invitation_expires_at IS NULL
     OR v_challenge.invitation_expires_at <= now() THEN
    UPDATE public.challenges
    SET status = 'expired',
        responded_at = now(),
        reschedule_reason = 'Convite expirado automaticamente'
    WHERE id = p_challenge_id
    RETURNING * INTO v_challenge;
    RETURN v_challenge;
  END IF;

  IF p_action = 'accept' THEN
    IF v_challenge.scheduled_date IS NULL OR v_challenge.scheduled_time IS NULL
       OR v_challenge.scheduled_date::timestamp + v_challenge.scheduled_time <= now() THEN
      RAISE EXCEPTION 'Não é possível aceitar um desafio expirado';
    END IF;
    v_next_status := 'scheduled';
  ELSIF p_action = 'decline' THEN
    v_next_status := 'declined';
  ELSE
    v_next_status := 'reschedule_requested';
  END IF;

  UPDATE public.challenges
  SET status = v_next_status,
      responded_at = now(),
      reschedule_reason = CASE WHEN p_action = 'reschedule' THEN NULLIF(trim(p_reason), '') ELSE NULL END
  WHERE id = p_challenge_id AND status = 'pending'
  RETURNING * INTO v_challenge;

  IF v_challenge.id IS NULL THEN RAISE EXCEPTION 'Este desafio não está mais pendente'; END IF;
  RETURN v_challenge;
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_challenge_invitation(uuid, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_challenge_invitation(uuid, text, text)
  TO authenticated;
