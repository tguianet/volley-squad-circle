
CREATE OR REPLACE FUNCTION public.handle_match_player_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_match RECORD;
  v_count INT;
  v_player_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_match FROM public.matches WHERE id = NEW.match_id;
    SELECT COUNT(*) INTO v_count FROM public.match_players
      WHERE match_id = NEW.match_id AND status = 'confirmed';
    IF v_count >= v_match.max_players AND v_match.status = 'open' THEN
      UPDATE public.matches SET status = 'full' WHERE id = NEW.match_id;
    END IF;
    IF NEW.player_id <> v_match.creator_id AND NEW.status = 'confirmed' THEN
      SELECT COALESCE(display_name, username, 'Um jogador') INTO v_player_name
        FROM public.profiles WHERE id = NEW.player_id;
      INSERT INTO public.notifications (user_id, kind, title, body, link_url)
      VALUES (
        v_match.creator_id,
        'match_join',
        'Novo jogador na sua partida',
        v_player_name || ' entrou em "' || v_match.title || '"',
        '/partidas'
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT * INTO v_match FROM public.matches WHERE id = OLD.match_id;
    SELECT COUNT(*) INTO v_count FROM public.match_players
      WHERE match_id = OLD.match_id AND status = 'confirmed';
    IF v_count < v_match.max_players AND v_match.status = 'full' THEN
      UPDATE public.matches SET status = 'open' WHERE id = OLD.match_id;
    END IF;
  END IF;
  RETURN NULL;
END; $$;
