-- Torna a inscricao em torneios atomica e impede bypass por escrita direta.

CREATE OR REPLACE FUNCTION public.register_for_tournament(p_tournament_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tournament public.tournaments%ROWTYPE;
  v_registration_id UUID;
  v_confirmed_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Faca login para se inscrever.';
  END IF;

  SELECT *
    INTO v_tournament
    FROM public.tournaments
   WHERE id = p_tournament_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Torneio nao encontrado.';
  END IF;

  IF v_tournament.status NOT IN ('open', 'featured', 'last_spots') THEN
    RAISE EXCEPTION 'As inscricoes deste torneio estao encerradas.';
  END IF;

  IF (v_tournament.event_date + v_tournament.start_time)
       AT TIME ZONE 'America/Sao_Paulo' <= now() THEN
    RAISE EXCEPTION 'Nao e possivel se inscrever depois do inicio do torneio.';
  END IF;

  SELECT id
    INTO v_registration_id
    FROM public.tournament_registrations
   WHERE tournament_id = p_tournament_id
     AND user_id = v_user_id
     AND status = 'confirmed';

  IF FOUND THEN
    RAISE EXCEPTION 'Voce ja esta inscrito neste torneio.';
  END IF;

  SELECT count(*)
    INTO v_confirmed_count
    FROM public.tournament_registrations
   WHERE tournament_id = p_tournament_id
     AND status = 'confirmed';

  IF v_confirmed_count >= v_tournament.max_teams THEN
    RAISE EXCEPTION 'O torneio ja atingiu o limite de inscritos.';
  END IF;

  INSERT INTO public.tournament_registrations (tournament_id, user_id, status)
  VALUES (p_tournament_id, v_user_id, 'confirmed')
  ON CONFLICT (tournament_id, user_id) DO UPDATE
    SET status = 'confirmed', registered_at = now()
  RETURNING id INTO v_registration_id;

  RETURN v_registration_id;
END;
$$;

REVOKE ALL ON FUNCTION public.register_for_tournament(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_for_tournament(UUID) TO authenticated;

DROP POLICY IF EXISTS "user registers self" ON public.tournament_registrations;
DROP POLICY IF EXISTS "registrations_insert_self" ON public.tournament_registrations;
DROP POLICY IF EXISTS "user cancels own registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "registrations_update_own" ON public.tournament_registrations;

REVOKE INSERT, UPDATE ON public.tournament_registrations FROM authenticated;
