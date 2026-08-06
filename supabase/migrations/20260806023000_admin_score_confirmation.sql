ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS score_admin_review_requested_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_admin_review_requested_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.request_challenge_score_admin_review(_challenge_id UUID)
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

  IF v_ch.status <> 'awaiting_confirmation' OR v_ch.score_registered_by IS NULL THEN
    RAISE EXCEPTION 'Este placar não está aguardando confirmação';
  END IF;

  IF auth.uid() <> v_ch.score_registered_by THEN
    RAISE EXCEPTION 'Apenas o capitão que enviou o placar pode chamar o ADM';
  END IF;

  IF v_ch.score_admin_review_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'O ADM já foi avisado sobre este placar';
  END IF;

  UPDATE public.challenges
  SET score_admin_review_requested_by = auth.uid(),
      score_admin_review_requested_at = now()
  WHERE id = _challenge_id
  RETURNING * INTO v_ch;

  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT DISTINCT ur.user_id, 'score_admin_review', 'Placar aguardando análise',
         'Um capitão solicitou a confirmação do ADM para o placar.', '/admin'
  FROM public.user_roles ur
  WHERE ur.role = 'admin';

  RETURN v_ch;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_challenge_score_admin_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'awaiting_confirmation'
     OR NEW.score_registered_at IS DISTINCT FROM OLD.score_registered_at THEN
    NEW.score_admin_review_requested_by := NULL;
    NEW.score_admin_review_requested_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS clear_challenge_score_admin_review ON public.challenges;
CREATE TRIGGER clear_challenge_score_admin_review
BEFORE UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.clear_challenge_score_admin_review();

REVOKE ALL ON FUNCTION public.request_challenge_score_admin_review(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_challenge_score_admin_review(UUID) TO authenticated;
