-- Repairs score RPCs for databases where the legacy internal functions were never created.

ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS score_admin_review_requested_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_admin_review_requested_at timestamptz;

CREATE OR REPLACE FUNCTION public.register_challenge_score(_challenge_id uuid, _score_challenger integer, _score_challenged integer)
RETURNS public.challenges LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ch public.challenges;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id=_challenge_id FOR UPDATE;
  IF v_ch.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_ch.status NOT IN ('scheduled','awaiting_confirmation') THEN RAISE EXCEPTION 'Desafio não está disponível para placar'; END IF;
  IF NOT (public.is_team_captain(auth.uid(),v_ch.challenger_team_id) OR public.is_team_captain(auth.uid(),v_ch.challenged_team_id) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Apenas capitães envolvidos podem registrar o placar'; END IF;
  IF NOT public.challenge_has_started(v_ch.scheduled_date,v_ch.scheduled_time) THEN RAISE EXCEPTION 'O placar só pode ser registrado após o início da partida'; END IF;
  IF _score_challenger<0 OR _score_challenged<0 OR _score_challenger=_score_challenged THEN RAISE EXCEPTION 'Informe um placar válido e sem empate'; END IF;
  PERFORM set_config('app.challenge_score_authorized','true',true);
  UPDATE public.challenges SET score_challenger=_score_challenger,score_challenged=_score_challenged,
    score_registered_by=auth.uid(),score_registered_at=now(),score_confirmed_by=NULL,score_confirmed_at=NULL,
    winner_team_id=NULL,loser_team_id=NULL,status='awaiting_confirmation'
  WHERE id=_challenge_id RETURNING * INTO v_ch;
  INSERT INTO public.notifications(user_id,kind,title,body,link_url)
  SELECT t.captain_id,'score_pending','Placar aguardando confirmação','Confirme o placar '||_score_challenger||' x '||_score_challenged,'/desafios'
  FROM public.teams t WHERE t.id IN(v_ch.challenger_team_id,v_ch.challenged_team_id) AND t.captain_id<>auth.uid();
  RETURN v_ch;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_challenge_score(_challenge_id uuid)
RETURNS public.challenges LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ch public.challenges; v_winner uuid; v_loser uuid;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id=_challenge_id FOR UPDATE;
  IF v_ch.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_ch.status<>'awaiting_confirmation' OR v_ch.score_registered_by IS NULL OR v_ch.score_challenger IS NULL OR v_ch.score_challenged IS NULL OR v_ch.score_challenger=v_ch.score_challenged THEN RAISE EXCEPTION 'Este desafio não possui um placar válido aguardando confirmação'; END IF;
  IF NOT (public.is_team_captain(auth.uid(),v_ch.challenger_team_id) OR public.is_team_captain(auth.uid(),v_ch.challenged_team_id) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Apenas capitães envolvidos ou administrador podem confirmar'; END IF;
  IF auth.uid()=v_ch.score_registered_by AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'A confirmação deve ser feita pelo outro capitão'; END IF;
  IF v_ch.score_challenger>v_ch.score_challenged THEN v_winner:=v_ch.challenger_team_id;v_loser:=v_ch.challenged_team_id; ELSE v_winner:=v_ch.challenged_team_id;v_loser:=v_ch.challenger_team_id; END IF;
  PERFORM set_config('app.challenge_score_authorized','true',true);
  UPDATE public.challenges SET score_confirmed_by=auth.uid(),score_confirmed_at=now(),winner_team_id=v_winner,loser_team_id=v_loser,status='completed'
  WHERE id=_challenge_id RETURNING * INTO v_ch;
  INSERT INTO public.notifications(user_id,kind,title,body,link_url)
  SELECT t.captain_id,'score_confirmed','Placar confirmado','Placar final '||v_ch.score_challenger||' x '||v_ch.score_challenged,'/desafios'
  FROM public.teams t WHERE t.id IN(v_ch.challenger_team_id,v_ch.challenged_team_id);
  RETURN v_ch;
END $$;

CREATE OR REPLACE FUNCTION public.reject_challenge_score(_challenge_id uuid)
RETURNS public.challenges LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_ch public.challenges;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id=_challenge_id FOR UPDATE;
  IF v_ch.id IS NULL THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;
  IF v_ch.status<>'awaiting_confirmation' THEN RAISE EXCEPTION 'Desafio não está aguardando confirmação'; END IF;
  IF NOT (public.is_team_captain(auth.uid(),v_ch.challenger_team_id) OR public.is_team_captain(auth.uid(),v_ch.challenged_team_id) OR public.has_role(auth.uid(),'admin')) THEN RAISE EXCEPTION 'Apenas capitães envolvidos ou administrador podem rejeitar'; END IF;
  IF auth.uid()=v_ch.score_registered_by AND NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'A rejeição deve ser feita pelo outro capitão'; END IF;
  PERFORM set_config('app.challenge_score_authorized','true',true);
  UPDATE public.challenges SET score_challenger=NULL,score_challenged=NULL,score_registered_by=NULL,score_registered_at=NULL,
    score_confirmed_by=NULL,score_confirmed_at=NULL,winner_team_id=NULL,loser_team_id=NULL,status='scheduled'
  WHERE id=_challenge_id RETURNING * INTO v_ch;
  INSERT INTO public.notifications(user_id,kind,title,body,link_url)
  SELECT t.captain_id,'score_rejected','Placar rejeitado','O placar foi rejeitado; registre novamente.','/desafios'
  FROM public.teams t WHERE t.id IN(v_ch.challenger_team_id,v_ch.challenged_team_id);
  RETURN v_ch;
END $$;

REVOKE ALL ON FUNCTION public.register_challenge_score(uuid,integer,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.confirm_challenge_score(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.reject_challenge_score(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_challenge_score(uuid,integer,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_challenge_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_challenge_score(uuid) TO authenticated;
