-- =====================================================
-- MIGRATION: Confirmação de Placar por Dois Capitães
-- =====================================================

-- 1) Adicionar novo status ao enum challenge_status
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel='awaiting_confirmation'
    AND enumtypid='challenge_status'::regtype) THEN
    ALTER TYPE challenge_status ADD VALUE 'awaiting_confirmation';
  END IF;
END $$;

-- 2) Adicionar campos para rastrear placar e confirmação
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS score_challenger INT,
  ADD COLUMN IF NOT EXISTS score_challenged INT,
  ADD COLUMN IF NOT EXISTS score_registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_confirmed_at TIMESTAMPTZ;

-- 3) Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_challenges_score_registered
  ON public.challenges(score_registered_by)
  WHERE score_registered_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_challenges_score_confirmed
  ON public.challenges(score_confirmed_by)
  WHERE score_confirmed_by IS NOT NULL;

-- 4) Atualizar trigger handle_challenge_status_change
-- Primeiro, removemos o trigger antigo
DROP TRIGGER IF EXISTS trg_challenges_status ON public.challenges;

-- Recriar a função com lógica atualizada para confirmação de placar
CREATE OR REPLACE FUNCTION public.handle_challenge_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_month DATE;
  v_winner_pos INT; v_loser_pos INT;
  v_winner_cat team_category; v_winner_gen team_gender;
  v_loser_cat team_category; v_loser_gen team_gender;
  v_middle_team UUID;
  v_new_wo_count INT;
  v_penalty INT;
BEGIN
  IF TG_OP='UPDATE' AND OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  v_month := date_trunc('month', COALESCE(NEW.scheduled_date, now()::DATE))::DATE;

  IF NEW.status='declined' THEN
    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'declined', -30, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;
    UPDATE public.teams SET points = points - 30 WHERE id = NEW.challenged_team_id;
    NEW.responded_at := COALESCE(NEW.responded_at, now());

    SELECT category, gender INTO v_loser_cat, v_loser_gen FROM public.teams WHERE id=NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen); END IF;

  ELSIF NEW.status='wo' THEN
    -- Incrementa contagem e aplica penalidade progressiva
    UPDATE public.teams
      SET wo_count = wo_count + 1
      WHERE id = NEW.challenged_team_id
      RETURNING wo_count INTO v_new_wo_count;

    IF v_new_wo_count = 1 THEN
      v_penalty := -20;
      UPDATE public.teams SET points = points + v_penalty WHERE id = NEW.challenged_team_id;
    ELSIF v_new_wo_count = 2 THEN
      v_penalty := -20;
      UPDATE public.teams
        SET points = points + v_penalty,
            suspended_until = (now()::DATE + INTERVAL '15 days')::DATE
        WHERE id = NEW.challenged_team_id;
    ELSE
      v_penalty := -50;
      UPDATE public.teams
        SET points = points + v_penalty,
            is_active = false,
            rank_position = NULL
        WHERE id = NEW.challenged_team_id;
    END IF;

    INSERT INTO public.monthly_penalties (team_id, month, reason, points, challenge_id)
    VALUES (NEW.challenged_team_id, v_month, 'walkover', v_penalty, NEW.id)
    ON CONFLICT (team_id, month, reason, challenge_id) DO NOTHING;

    SELECT category, gender INTO v_loser_cat, v_loser_gen FROM public.teams WHERE id=NEW.challenged_team_id;
    IF v_loser_cat IS NOT NULL THEN PERFORM public.recompute_ranks_below_podium(v_loser_cat, v_loser_gen); END IF;

    -- Notificações
    INSERT INTO public.notifications (user_id, kind, title, body, link_url)
    SELECT t.captain_id, 'wo_penalty',
      CASE v_new_wo_count
        WHEN 1 THEN 'W.O. registrado (-20 pts)'
        WHEN 2 THEN 'Segundo W.O. — suspensão de 15 dias'
        ELSE 'Terceiro W.O. — removido do ranking'
      END,
      'Sua equipe ' || t.name || ' acumulou ' || v_new_wo_count || ' W.O.',
      '/desafios'
    FROM public.teams t WHERE t.id = NEW.challenged_team_id;

  ELSIF NEW.status='completed' THEN
    -- Apenas atualiza ranking se houver placar confirmado
    IF NEW.score_challenger IS NOT NULL 
       AND NEW.score_challenged IS NOT NULL
       AND NEW.score_confirmed_by IS NOT NULL THEN
      
      -- Determinar vencedor e perdedor baseado no placar
      IF NEW.score_challenger > NEW.score_challenged THEN
        NEW.winner_team_id := NEW.challenger_team_id;
        NEW.loser_team_id := NEW.challenged_team_id;
      ELSIF NEW.score_challenged > NEW.score_challenger THEN
        NEW.winner_team_id := NEW.challenged_team_id;
        NEW.loser_team_id := NEW.challenger_team_id;
      END IF;
      
      IF NEW.winner_team_id IS NOT NULL AND NEW.loser_team_id IS NOT NULL THEN
        UPDATE public.teams SET wins=wins+1, current_streak=current_streak+1 WHERE id=NEW.winner_team_id;
        UPDATE public.teams SET losses=losses+1, current_streak=0 WHERE id=NEW.loser_team_id;

        SELECT rank_position, category, gender INTO v_winner_pos, v_winner_cat, v_winner_gen
          FROM public.teams WHERE id=NEW.winner_team_id;
        SELECT rank_position, category, gender INTO v_loser_pos, v_loser_cat, v_loser_gen
          FROM public.teams WHERE id=NEW.loser_team_id;

        IF v_winner_cat=v_loser_cat AND v_winner_gen=v_loser_gen
           AND v_winner_pos IS NOT NULL AND v_loser_pos IS NOT NULL
           AND v_winner_pos > v_loser_pos THEN
          IF v_winner_pos <= 3 THEN
            UPDATE public.teams SET rank_position=v_loser_pos WHERE id=NEW.winner_team_id;
            UPDATE public.teams SET rank_position=v_winner_pos WHERE id=NEW.loser_team_id;
          ELSIF v_loser_pos <= 3 THEN
            IF v_loser_pos + 1 <= 3 THEN
              DECLARE cur_pos INT := v_loser_pos + 1;
                      prev_team UUID := NEW.loser_team_id;
                      swap_team UUID;
              BEGIN
                WHILE cur_pos <= 3 LOOP
                  SELECT id INTO swap_team FROM public.teams
                    WHERE category=v_winner_cat AND gender=v_winner_gen
                      AND rank_position=cur_pos AND is_active=true LIMIT 1;
                  UPDATE public.teams SET rank_position=cur_pos WHERE id=prev_team;
                  prev_team := swap_team;
                  cur_pos := cur_pos + 1;
                  EXIT WHEN swap_team IS NULL;
                END LOOP;
                IF prev_team IS NOT NULL THEN
                  UPDATE public.teams SET rank_position=v_winner_pos WHERE id=prev_team;
                END IF;
                UPDATE public.teams SET rank_position=v_loser_pos WHERE id=NEW.winner_team_id;
              END;
            ELSE
              SELECT id INTO v_middle_team FROM public.teams
                WHERE category=v_winner_cat AND gender=v_winner_gen
                  AND rank_position=v_loser_pos+1 AND is_active=true LIMIT 1;
              UPDATE public.teams SET rank_position=v_loser_pos WHERE id=NEW.winner_team_id;
              UPDATE public.teams SET rank_position=v_loser_pos+1 WHERE id=NEW.loser_team_id;
              IF v_middle_team IS NOT NULL AND v_middle_team <> NEW.winner_team_id THEN
                UPDATE public.teams SET rank_position=v_winner_pos WHERE id=v_middle_team;
              END IF;
            END IF;
          END IF;
        END IF;

        IF v_winner_cat IS NOT NULL THEN
          PERFORM public.recompute_ranks_below_podium(v_winner_cat, v_winner_gen);
        END IF;
      END IF;
    END IF;

  ELSIF NEW.status='scheduled' THEN
    NEW.responded_at := COALESCE(NEW.responded_at, now());
  END IF;

  RETURN NEW;
END;
$function$;

-- Recriar o trigger
CREATE TRIGGER trg_challenges_status
  BEFORE INSERT OR UPDATE OF status ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.handle_challenge_status_change();

-- 5) Criar função RPC para registrar placar (primeiro capitão)
CREATE OR REPLACE FUNCTION public.register_score(
  _challenge_id UUID,
  _score_challenger INT,
  _score_challenged INT
) RETURNS public.challenges
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_ch public.challenges;
  v_captain_id UUID;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;

  -- Validação: status deve ser 'scheduled'
  IF v_ch.status <> 'scheduled' THEN
    RAISE EXCEPTION 'Desafio não está agendado (status: %)', v_ch.status;
  END IF;

  -- Validação: usuário deve ser capitão de um dos times
  v_captain_id := auth.uid();
  IF NOT (v_ch.challenger_team_id = (SELECT id FROM public.teams WHERE captain_id = v_captain_id)
       OR v_ch.challenged_team_id = (SELECT id FROM public.teams WHERE captain_id = v_captain_id)) THEN
    RAISE EXCEPTION 'Apenas capitães dos times envolvidos podem registrar placar';
  END IF;

  -- Validação: placar não pode ser negativo
  IF _score_challenger < 0 OR _score_challenged < 0 THEN
    RAISE EXCEPTION 'Placar não pode ser negativo';
  END IF;

  -- Atualizar desafio
  UPDATE public.challenges
    SET score_challenger = _score_challenger,
        score_challenged = _score_challenged,
        score_registered_by = v_captain_id,
        score_registered_at = now(),
        score_confirmed_by = NULL,
        score_confirmed_at = NULL,
        status = 'awaiting_confirmation'
    WHERE id = _challenge_id
    RETURNING * INTO v_ch;

  -- Notificar o outro capitão
  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT t.captain_id, 'score_pending',
         'Placar registrado - aguardando confirmação',
         'Placar: ' || _score_challenger || ' x ' || _score_challenged || '. Confirme ou dispute.',
         '/desafios'
  FROM public.teams t
  WHERE t.id IN (v_ch.challenger_team_id, v_ch.challenged_team_id)
    AND t.captain_id <> v_captain_id;

  RETURN v_ch;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.register_score(UUID, INT, INT) TO authenticated;

-- 6) Criar função RPC para confirmar placar (segundo capitão)
CREATE OR REPLACE FUNCTION public.confirm_score(
  _challenge_id UUID
) RETURNS public.challenges
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_ch public.challenges;
  v_captain_id UUID;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;

  -- Validação: status deve ser 'awaiting_confirmation'
  IF v_ch.status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Desafio não está aguardando confirmação (status: %)', v_ch.status;
  END IF;

  -- Validação: usuário deve ser capitão do outro time (não quem registrou)
  v_captain_id := auth.uid();
  IF v_ch.score_registered_by = v_captain_id THEN
    RAISE EXCEPTION 'Você não pode confirmar seu próprio placar';
  END IF;
  
  IF NOT (v_ch.challenger_team_id = (SELECT id FROM public.teams WHERE captain_id = v_captain_id)
       OR v_ch.challenged_team_id = (SELECT id FROM public.teams WHERE captain_id = v_captain_id)) THEN
    RAISE EXCEPTION 'Apenas capitães dos times envolvidos podem confirmar placar';
  END IF;

  -- Atualizar desafio para completed
  UPDATE public.challenges
    SET score_confirmed_by = v_captain_id,
        score_confirmed_at = now(),
        status = 'completed'
    WHERE id = _challenge_id
    RETURNING * INTO v_ch;

  -- Notificar ambos os capitães
  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT t.captain_id, 'score_confirmed',
         'Placar confirmado',
         'Placar final: ' || v_ch.score_challenger || ' x ' || v_ch.score_challenged,
         '/desafios'
  FROM public.teams t
  WHERE t.id IN (v_ch.challenger_team_id, v_ch.challenged_team_id);

  RETURN v_ch;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.confirm_score(UUID) TO authenticated;

-- 7) Criar função RPC para disputar placar (segundo capitão informa placar diferente)
CREATE OR REPLACE FUNCTION public.dispute_score(
  _challenge_id UUID,
  _score_challenger INT,
  _score_challenged INT
) RETURNS public.challenges
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE
  v_ch public.challenges;
  v_captain_id UUID;
BEGIN
  SELECT * INTO v_ch FROM public.challenges WHERE id = _challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Desafio não encontrado'; END IF;

  -- Validação: status deve ser 'awaiting_confirmation'
  IF v_ch.status <> 'awaiting_confirmation' THEN
    RAISE EXCEPTION 'Desafio não está aguardando confirmação (status: %)', v_ch.status;
  END IF;

  -- Validação: usuário deve ser capitão do outro time (não quem registrou)
  v_captain_id := auth.uid();
  IF v_ch.score_registered_by = v_captain_id THEN
    RAISE EXCEPTION 'Você não pode disputar seu próprio placar. Use a função de registro.';
  END IF;
  
  IF NOT (v_ch.challenger_team_id = (SELECT id FROM public.teams WHERE captain_id = v_captain_id)
       OR v_ch.challenged_team_id = (SELECT id FROM public.teams WHERE captain_id = v_captain_id)) THEN
    RAISE EXCEPTION 'Apenas capitães dos times envolvidos podem disputar placar';
  END IF;

  -- Validação: placar não pode ser negativo
  IF _score_challenger < 0 OR _score_challenged < 0 THEN
    RAISE EXCEPTION 'Placar não pode ser negativo';
  END IF;

  -- Atualizar desafio com novo placar e resetar confirmação
  UPDATE public.challenges
    SET score_challenger = _score_challenger,
        score_challenged = _score_challenged,
        score_registered_by = v_captain_id,
        score_registered_at = now(),
        score_confirmed_by = NULL,
        score_confirmed_at = NULL,
        status = 'awaiting_confirmation'
    WHERE id = _challenge_id
    RETURNING * INTO v_ch;

  -- Notificar o outro capitão
  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT t.captain_id, 'score_disputed',
         'Placar contestado - nova confirmação necessária',
         'Novo placar: ' || _score_challenger || ' x ' || _score_challenged || '. Confirme ou dispute.',
         '/desafios'
  FROM public.teams t
  WHERE t.id IN (v_ch.challenger_team_id, v_ch.challenged_team_id)
    AND t.captain_id <> v_captain_id;

  RETURN v_ch;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.dispute_score(UUID, INT, INT) TO authenticated;
