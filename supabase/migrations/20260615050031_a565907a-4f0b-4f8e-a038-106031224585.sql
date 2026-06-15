-- Register score (by one captain)
CREATE OR REPLACE FUNCTION public.register_challenge_score(
  _challenge_id UUID,
  _score_challenger INT,
  _score_challenged INT
) RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.challenges;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;

  IF NOT (public.is_team_captain(auth.uid(), v_ch.challenger_team_id)
       OR public.is_team_captain(auth.uid(), v_ch.challenged_team_id)
       OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Apenas capitães envolvidos podem registrar o placar';
  END IF;

  IF v_ch.status NOT IN ('scheduled', 'awaiting_confirmation') THEN
    RAISE EXCEPTION 'Desafio não está em status válido para registro de placar (%)', v_ch.status;
  END IF;

  IF _score_challenger < 0 OR _score_challenged < 0 THEN
    RAISE EXCEPTION 'Placar inválido';
  END IF;

  IF _score_challenger = _score_challenged THEN
    RAISE EXCEPTION 'Não pode haver empate';
  END IF;

  UPDATE public.challenges
    SET score_challenger = _score_challenger,
        score_challenged = _score_challenged,
        score_registered_by = auth.uid(),
        score_registered_at = now(),
        score_confirmed_by = NULL,
        score_confirmed_at = NULL,
        status = 'awaiting_confirmation'
    WHERE id = _challenge_id
    RETURNING * INTO v_ch;

  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT t.captain_id, 'score_pending',
         'Placar aguardando sua confirmação',
         'Confirme o placar ' || _score_challenger || ' x ' || _score_challenged,
         '/desafios'
  FROM public.teams t
  WHERE t.id IN (v_ch.challenger_team_id, v_ch.challenged_team_id)
    AND t.captain_id <> auth.uid();

  RETURN v_ch;
END;
$$;

-- Confirm score (by the OTHER captain)
CREATE OR REPLACE FUNCTION public.confirm_challenge_score(_challenge_id UUID)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.challenges;
  v_winner UUID;
  v_loser UUID;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;

  IF v_ch.status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Desafio não está aguardando confirmação';
  END IF;

  IF v_ch.score_registered_by IS NULL THEN
    RAISE EXCEPTION 'Nenhum placar registrado';
  END IF;

  IF NOT (public.is_team_captain(auth.uid(), v_ch.challenger_team_id)
       OR public.is_team_captain(auth.uid(), v_ch.challenged_team_id)
       OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Apenas capitães envolvidos podem confirmar';
  END IF;

  IF auth.uid() = v_ch.score_registered_by AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'A confirmação deve ser feita pelo outro capitão';
  END IF;

  IF v_ch.score_challenger > v_ch.score_challenged THEN
    v_winner := v_ch.challenger_team_id;
    v_loser := v_ch.challenged_team_id;
  ELSE
    v_winner := v_ch.challenged_team_id;
    v_loser := v_ch.challenger_team_id;
  END IF;

  UPDATE public.challenges
    SET score_confirmed_by = auth.uid(),
        score_confirmed_at = now(),
        winner_team_id = v_winner,
        loser_team_id = v_loser,
        status = 'completed'
    WHERE id = _challenge_id
    RETURNING * INTO v_ch;

  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT t.captain_id, 'score_confirmed',
         'Placar confirmado',
         'Placar final ' || v_ch.score_challenger || ' x ' || v_ch.score_challenged,
         '/desafios'
  FROM public.teams t
  WHERE t.id IN (v_ch.challenger_team_id, v_ch.challenged_team_id);

  RETURN v_ch;
END;
$$;

-- Reject score (by the OTHER captain) -> back to scheduled
CREATE OR REPLACE FUNCTION public.reject_challenge_score(_challenge_id UUID)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ch public.challenges;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;

  IF v_ch.status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Desafio não está aguardando confirmação';
  END IF;

  IF NOT (public.is_team_captain(auth.uid(), v_ch.challenger_team_id)
       OR public.is_team_captain(auth.uid(), v_ch.challenged_team_id)
       OR public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Apenas capitães envolvidos podem rejeitar';
  END IF;

  IF auth.uid() = v_ch.score_registered_by AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'A rejeição deve ser feita pelo outro capitão';
  END IF;

  UPDATE public.challenges
    SET score_challenger = NULL,
        score_challenged = NULL,
        score_registered_by = NULL,
        score_registered_at = NULL,
        score_confirmed_by = NULL,
        score_confirmed_at = NULL,
        status = 'scheduled'
    WHERE id = _challenge_id
    RETURNING * INTO v_ch;

  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT t.captain_id, 'score_rejected',
         'Placar rejeitado',
         'O placar foi rejeitado, registre novamente',
         '/desafios'
  FROM public.teams t
  WHERE t.id IN (v_ch.challenger_team_id, v_ch.challenged_team_id);

  RETURN v_ch;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_challenge_score(UUID, INT, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.confirm_challenge_score(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_challenge_score(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.register_challenge_score(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_challenge_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_challenge_score(UUID) TO authenticated;