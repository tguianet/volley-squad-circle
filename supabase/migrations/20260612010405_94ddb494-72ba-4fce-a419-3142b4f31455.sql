
CREATE TABLE public.team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL,
  invitee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  UNIQUE (team_id, invitee_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_invitations TO authenticated;
GRANT ALL ON public.team_invitations TO service_role;

ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view own invites" ON public.team_invitations
  FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "captain can invite" ON public.team_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = inviter_id
    AND EXISTS (SELECT 1 FROM public.teams t WHERE t.id = team_id AND t.captain_id = auth.uid())
  );

CREATE POLICY "invitee can respond" ON public.team_invitations
  FOR UPDATE TO authenticated
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = invitee_id OR auth.uid() = inviter_id);

CREATE POLICY "inviter can delete pending" ON public.team_invitations
  FOR DELETE TO authenticated
  USING (auth.uid() = inviter_id AND status = 'pending');

CREATE OR REPLACE FUNCTION public.handle_team_invitation_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_team RECORD;
  v_inviter_name TEXT;
  v_invitee_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT * INTO v_team FROM public.teams WHERE id = NEW.team_id;
    SELECT COALESCE(display_name, username, 'Alguém') INTO v_inviter_name
      FROM public.profiles WHERE id = NEW.inviter_id;
    INSERT INTO public.notifications (user_id, kind, title, body, link_url)
    VALUES (
      NEW.invitee_id,
      'team_invite',
      'Convite para time',
      v_inviter_name || ' convidou você para o time "' || v_team.name || '"',
      '/perfil'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status IN ('accepted','declined') THEN
    SELECT * INTO v_team FROM public.teams WHERE id = NEW.team_id;
    SELECT COALESCE(display_name, username, 'Alguém') INTO v_invitee_name
      FROM public.profiles WHERE id = NEW.invitee_id;
    INSERT INTO public.notifications (user_id, kind, title, body, link_url)
    VALUES (
      NEW.inviter_id,
      'team_invite_response',
      CASE WHEN NEW.status = 'accepted' THEN 'Convite aceito' ELSE 'Convite recusado' END,
      v_invitee_name || CASE WHEN NEW.status = 'accepted' THEN ' aceitou' ELSE ' recusou' END
        || ' entrar em "' || v_team.name || '"',
      '/perfil'
    );
    IF NEW.status = 'accepted' THEN
      INSERT INTO public.team_members (team_id, profile_id)
      VALUES (NEW.team_id, NEW.invitee_id)
      ON CONFLICT DO NOTHING;
    END IF;
    NEW.responded_at := now();
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_team_invitation_insert
AFTER INSERT ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.handle_team_invitation_change();

CREATE TRIGGER trg_team_invitation_update
BEFORE UPDATE ON public.team_invitations
FOR EACH ROW EXECUTE FUNCTION public.handle_team_invitation_change();
