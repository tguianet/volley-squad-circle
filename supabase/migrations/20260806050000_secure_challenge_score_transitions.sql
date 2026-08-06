-- Protege o fluxo de placar contra alterações diretas na tabela.
-- As funções públicas abaixo continuam sendo a única entrada permitida.

ALTER FUNCTION public.register_challenge_score(uuid, integer, integer)
  RENAME TO register_challenge_score_internal;
ALTER FUNCTION public.confirm_challenge_score(uuid)
  RENAME TO confirm_challenge_score_internal;
ALTER FUNCTION public.reject_challenge_score(uuid)
  RENAME TO reject_challenge_score_internal;

REVOKE ALL ON FUNCTION public.register_challenge_score_internal(uuid, integer, integer)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.confirm_challenge_score_internal(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_challenge_score_internal(uuid)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_challenge_score_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_authorized boolean :=
    current_setting('app.challenge_score_authorized', true) = 'true';
  v_touches_score boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_touches_score :=
      NEW.status IN ('awaiting_confirmation', 'completed')
      OR NEW.score_challenger IS NOT NULL
      OR NEW.score_challenged IS NOT NULL
      OR NEW.score_registered_by IS NOT NULL
      OR NEW.score_confirmed_by IS NOT NULL
      OR NEW.winner_team_id IS NOT NULL
      OR NEW.loser_team_id IS NOT NULL;
  ELSE
    v_touches_score :=
      NEW.score_challenger IS DISTINCT FROM OLD.score_challenger
      OR NEW.score_challenged IS DISTINCT FROM OLD.score_challenged
      OR NEW.score_registered_by IS DISTINCT FROM OLD.score_registered_by
      OR NEW.score_registered_at IS DISTINCT FROM OLD.score_registered_at
      OR NEW.score_confirmed_by IS DISTINCT FROM OLD.score_confirmed_by
      OR NEW.score_confirmed_at IS DISTINCT FROM OLD.score_confirmed_at
      OR NEW.winner_team_id IS DISTINCT FROM OLD.winner_team_id
      OR NEW.loser_team_id IS DISTINCT FROM OLD.loser_team_id
      OR (
        NEW.status IS DISTINCT FROM OLD.status
        AND (
          NEW.status IN ('awaiting_confirmation', 'completed')
          OR OLD.status IN ('awaiting_confirmation', 'completed')
        )
      );
  END IF;

  IF v_touches_score AND NOT v_authorized THEN
    RAISE EXCEPTION 'Use a operação segura para alterar o placar';
  END IF;

  IF NEW.status = 'completed' THEN
    IF NEW.score_challenger IS NULL
       OR NEW.score_challenged IS NULL
       OR NEW.score_challenger < 0
       OR NEW.score_challenged < 0
       OR NEW.score_challenger = NEW.score_challenged THEN
      RAISE EXCEPTION 'Placar final inválido';
    END IF;

    IF NEW.score_confirmed_by IS NULL
       OR NEW.score_registered_by IS NULL
       OR NEW.score_confirmed_by = NEW.score_registered_by THEN
      RAISE EXCEPTION 'O placar exige duas confirmações diferentes';
    END IF;

    IF NEW.score_challenger > NEW.score_challenged THEN
      IF NEW.winner_team_id IS DISTINCT FROM NEW.challenger_team_id
         OR NEW.loser_team_id IS DISTINCT FROM NEW.challenged_team_id THEN
        RAISE EXCEPTION 'Vencedor e perdedor não correspondem ao placar';
      END IF;
    ELSE
      IF NEW.winner_team_id IS DISTINCT FROM NEW.challenged_team_id
         OR NEW.loser_team_id IS DISTINCT FROM NEW.challenger_team_id THEN
        RAISE EXCEPTION 'Vencedor e perdedor não correspondem ao placar';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_challenge_score_transition ON public.challenges;
CREATE TRIGGER trg_guard_challenge_score_transition
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_challenge_score_transition();

CREATE OR REPLACE FUNCTION public.register_challenge_score(
  _challenge_id uuid,
  _score_challenger integer,
  _score_challenged integer
)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.challenges;
BEGIN
  IF _score_challenger < 0
     OR _score_challenged < 0
     OR _score_challenger = _score_challenged THEN
    RAISE EXCEPTION 'Informe um placar válido e sem empate';
  END IF;

  PERFORM set_config('app.challenge_score_authorized', 'true', true);
  SELECT * INTO v_result
  FROM public.register_challenge_score_internal(
    _challenge_id,
    _score_challenger,
    _score_challenged
  );
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_challenge_score(_challenge_id uuid)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.challenges;
BEGIN
  PERFORM set_config('app.challenge_score_authorized', 'true', true);
  SELECT * INTO v_result
  FROM public.confirm_challenge_score_internal(_challenge_id);
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_challenge_score(_challenge_id uuid)
RETURNS public.challenges
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result public.challenges;
BEGIN
  PERFORM set_config('app.challenge_score_authorized', 'true', true);
  SELECT * INTO v_result
  FROM public.reject_challenge_score_internal(_challenge_id);
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.register_challenge_score(uuid, integer, integer)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.confirm_challenge_score(uuid)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reject_challenge_score(uuid)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.register_challenge_score(uuid, integer, integer)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_challenge_score(uuid)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_challenge_score(uuid)
  TO authenticated;
