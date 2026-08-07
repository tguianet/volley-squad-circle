-- Cancela a propria inscricao de forma atomica e bloqueia exclusao direta.

CREATE OR REPLACE FUNCTION public.cancel_tournament_registration(p_tournament_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_tournament public.tournaments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Faca login para cancelar sua inscricao.';
  END IF;

  SELECT *
    INTO v_tournament
    FROM public.tournaments
   WHERE id = p_tournament_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Torneio nao encontrado.';
  END IF;

  IF (v_tournament.event_date + v_tournament.start_time)
       AT TIME ZONE 'America/Sao_Paulo' <= now() THEN
    RAISE EXCEPTION 'Nao e possivel cancelar depois do inicio do torneio.';
  END IF;

  UPDATE public.tournament_registrations
     SET status = 'cancelled'
   WHERE tournament_id = p_tournament_id
     AND user_id = v_user_id
     AND status = 'confirmed';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscricao ativa nao encontrada.';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_tournament_registration(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_tournament_registration(UUID) TO authenticated;

DROP POLICY IF EXISTS "user removes own registration" ON public.tournament_registrations;
DROP POLICY IF EXISTS "registrations_delete_own" ON public.tournament_registrations;
REVOKE DELETE ON public.tournament_registrations FROM authenticated;
