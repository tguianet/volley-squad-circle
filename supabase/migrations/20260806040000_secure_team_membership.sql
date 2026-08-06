-- Keep invitation responses and captain departures atomic and server-authorized.

DROP POLICY IF EXISTS "invitee can respond" ON public.team_invitations;

CREATE OR REPLACE FUNCTION public.respond_to_team_invitation(
  p_invitation_id uuid,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation public.team_invitations%ROWTYPE;
BEGIN
  IF p_status NOT IN ('accepted', 'declined') THEN
    RAISE EXCEPTION 'Resposta de convite inválida';
  END IF;

  SELECT * INTO v_invitation
  FROM public.team_invitations
  WHERE id = p_invitation_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite não encontrado';
  END IF;

  IF v_invitation.invitee_id <> auth.uid() THEN
    RAISE EXCEPTION 'Somente o jogador convidado pode responder';
  END IF;

  IF v_invitation.status <> 'pending' THEN
    RAISE EXCEPTION 'Este convite já foi respondido';
  END IF;

  UPDATE public.team_invitations
  SET status = p_status
  WHERE id = p_invitation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_team(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team public.teams%ROWTYPE;
  v_new_captain_id uuid;
BEGIN
  SELECT * INTO v_team
  FROM public.teams
  WHERE id = p_team_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time não encontrado';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE team_id = p_team_id AND profile_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Você não faz parte deste time';
  END IF;

  IF v_team.captain_id <> auth.uid() THEN
    DELETE FROM public.team_members
    WHERE team_id = p_team_id AND profile_id = auth.uid();
    RETURN 'left';
  END IF;

  SELECT profile_id INTO v_new_captain_id
  FROM public.team_members
  WHERE team_id = p_team_id AND profile_id <> auth.uid()
  ORDER BY joined_at, profile_id
  LIMIT 1;

  IF v_new_captain_id IS NULL THEN
    DELETE FROM public.teams WHERE id = p_team_id;
    RETURN 'deleted';
  END IF;

  UPDATE public.teams
  SET captain_id = v_new_captain_id
  WHERE id = p_team_id;

  DELETE FROM public.team_members
  WHERE team_id = p_team_id AND profile_id = auth.uid();

  RETURN 'transferred';
END;
$$;

REVOKE ALL ON FUNCTION public.respond_to_team_invitation(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.leave_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.respond_to_team_invitation(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_team(uuid) TO authenticated;
