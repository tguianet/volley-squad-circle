-- Teams are formed from public social profiles, one invitation at a time.
-- Incomplete teams stay inactive and therefore cannot enter the ranking or challenges.

REVOKE EXECUTE ON FUNCTION public.create_team_with_invites(
  text,
  public.team_category,
  public.team_gender,
  uuid[]
) FROM authenticated;

CREATE OR REPLACE FUNCTION public.create_team_from_social_profile(
  p_name text,
  p_category public.team_category,
  p_gender public.team_gender,
  p_invitee_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
  v_captain_gender text;
  v_invitee_gender text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para montar uma equipe';
  END IF;
  IF p_invitee_id = auth.uid() THEN
    RAISE EXCEPTION 'Escolha outro jogador para a equipe';
  END IF;
  IF length(btrim(p_name)) < 2 OR length(btrim(p_name)) > 60 THEN
    RAISE EXCEPTION 'O nome da equipe deve ter entre 2 e 60 caracteres';
  END IF;

  SELECT genero INTO v_captain_gender
  FROM public.profiles
  WHERE id = auth.uid() AND NOT COALESCE(is_suspended, false);
  SELECT genero INTO v_invitee_gender
  FROM public.profiles
  WHERE id = p_invitee_id AND NOT COALESCE(is_suspended, false);

  IF v_captain_gender IS NULL OR v_invitee_gender IS NULL THEN
    RAISE EXCEPTION 'Os dois jogadores precisam preencher o gênero no perfil';
  END IF;
  IF p_gender IN ('M', 'F')
     AND (v_captain_gender <> p_gender::text OR v_invitee_gender <> p_gender::text) THEN
    RAISE EXCEPTION 'Os jogadores não correspondem ao formato escolhido';
  END IF;
  IF p_category = 'dupla' AND p_gender = 'X' AND v_captain_gender = v_invitee_gender THEN
    RAISE EXCEPTION 'A dupla mista precisa ter jogadores de gêneros diferentes';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.teams
    WHERE captain_id = auth.uid()
      AND category = p_category
      AND gender = p_gender
      AND is_active
  ) THEN
    RAISE EXCEPTION 'Você já possui uma equipe ativa neste formato';
  END IF;

  INSERT INTO public.teams (name, category, gender, captain_id, is_active)
  VALUES (btrim(p_name), p_category, p_gender, auth.uid(), false)
  RETURNING id INTO v_team_id;

  INSERT INTO public.team_members (team_id, profile_id)
  VALUES (v_team_id, auth.uid());

  INSERT INTO public.team_invitations (team_id, inviter_id, invitee_id)
  VALUES (v_team_id, auth.uid(), p_invitee_id);

  RETURN v_team_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_profile_to_team(
  p_team_id uuid,
  p_invitee_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_invitee_gender text;
  v_reserved_count integer;
  v_capacity integer;
  v_invitation_id uuid;
BEGIN
  SELECT * INTO v_team
  FROM public.teams
  WHERE id = p_team_id
  FOR UPDATE;

  IF NOT FOUND OR v_team.captain_id <> auth.uid() THEN
    RAISE EXCEPTION 'Somente o capitão pode convidar para esta equipe';
  END IF;
  IF v_team.is_active THEN
    RAISE EXCEPTION 'Esta equipe já está completa';
  END IF;
  IF p_invitee_id = auth.uid() THEN
    RAISE EXCEPTION 'Você já faz parte desta equipe';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND profile_id = p_invitee_id
  ) OR EXISTS (
    SELECT 1 FROM public.team_invitations
    WHERE team_id = p_team_id AND invitee_id = p_invitee_id AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Este jogador já faz parte da equipe ou possui convite pendente';
  END IF;

  SELECT genero INTO v_invitee_gender
  FROM public.profiles
  WHERE id = p_invitee_id AND NOT COALESCE(is_suspended, false);
  IF v_invitee_gender IS NULL THEN
    RAISE EXCEPTION 'O jogador precisa preencher o gênero no perfil';
  END IF;
  IF v_team.gender IN ('M', 'F') AND v_invitee_gender <> v_team.gender::text THEN
    RAISE EXCEPTION 'O jogador não corresponde ao formato desta equipe';
  END IF;

  v_capacity := CASE WHEN v_team.category = 'quarteto' THEN 4 ELSE 2 END;
  SELECT
    (SELECT count(*) FROM public.team_members WHERE team_id = p_team_id)
    +
    (SELECT count(*) FROM public.team_invitations
     WHERE team_id = p_team_id AND status = 'pending')
  INTO v_reserved_count;
  IF v_reserved_count >= v_capacity THEN
    RAISE EXCEPTION 'Esta equipe já atingiu o limite de jogadores e convites';
  END IF;

  DELETE FROM public.team_invitations
  WHERE team_id = p_team_id
    AND invitee_id = p_invitee_id
    AND status IN ('declined', 'cancelled');

  INSERT INTO public.team_invitations (team_id, inviter_id, invitee_id)
  VALUES (p_team_id, auth.uid(), p_invitee_id)
  RETURNING id INTO v_invitation_id;
  RETURN v_invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_my_incomplete_teams_for_invite()
RETURNS TABLE (
  id uuid,
  name text,
  category public.team_category,
  gender public.team_gender,
  confirmed_count integer,
  pending_invitee_ids uuid[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.category,
    t.gender,
    (SELECT count(*)::integer FROM public.team_members tm WHERE tm.team_id = t.id),
    ARRAY(
      SELECT ti.invitee_id
      FROM public.team_invitations ti
      WHERE ti.team_id = t.id AND ti.status = 'pending'
    )
  FROM public.teams t
  WHERE t.captain_id = auth.uid()
    AND NOT t.is_active
  ORDER BY t.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.activate_team_when_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_member_count integer;
  v_expected integer;
  v_male_count integer;
  v_female_count integer;
BEGIN
  IF NEW.status <> 'accepted' OR OLD.status = 'accepted' THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_team FROM public.teams WHERE id = NEW.team_id FOR UPDATE;
  SELECT count(*),
         count(*) FILTER (WHERE p.genero = 'M'),
         count(*) FILTER (WHERE p.genero = 'F')
  INTO v_member_count, v_male_count, v_female_count
  FROM public.team_members tm
  JOIN public.profiles p ON p.id = tm.profile_id
  WHERE tm.team_id = NEW.team_id;

  v_expected := CASE WHEN v_team.category = 'quarteto' THEN 4 ELSE 2 END;
  IF v_member_count = v_expected THEN
    IF v_team.gender = 'X' AND (v_male_count = 0 OR v_female_count = 0) THEN
      RAISE EXCEPTION 'A equipe mista precisa ter jogadores dos dois gêneros';
    END IF;
    UPDATE public.teams SET is_active = true WHERE id = NEW.team_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_activate_team_when_complete ON public.team_invitations;
CREATE TRIGGER trg_activate_team_when_complete
AFTER UPDATE OF status ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.activate_team_when_complete();

CREATE OR REPLACE FUNCTION public.deactivate_incomplete_team()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expected integer;
BEGIN
  SELECT CASE WHEN category = 'quarteto' THEN 4 ELSE 2 END
  INTO v_expected
  FROM public.teams
  WHERE id = OLD.team_id;

  IF v_expected IS NOT NULL AND (
    SELECT count(*) FROM public.team_members WHERE team_id = OLD.team_id
  ) < v_expected THEN
    UPDATE public.teams SET is_active = false WHERE id = OLD.team_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_deactivate_incomplete_team ON public.team_members;
CREATE TRIGGER trg_deactivate_incomplete_team
AFTER DELETE ON public.team_members
FOR EACH ROW EXECUTE FUNCTION public.deactivate_incomplete_team();

REVOKE ALL ON FUNCTION public.create_team_from_social_profile(
  text,
  public.team_category,
  public.team_gender,
  uuid
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.invite_profile_to_team(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_my_incomplete_teams_for_invite() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_team_from_social_profile(
  text,
  public.team_category,
  public.team_gender,
  uuid
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_profile_to_team(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_incomplete_teams_for_invite() TO authenticated;
