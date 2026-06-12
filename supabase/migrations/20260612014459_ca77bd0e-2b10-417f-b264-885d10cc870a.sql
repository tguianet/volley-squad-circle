
-- Allow captain to delete own team
CREATE POLICY "Captain can delete team"
ON public.teams
FOR DELETE
USING (captain_id = auth.uid());

-- Allow members to leave team (delete own membership)
CREATE POLICY "Members can leave team"
ON public.team_members
FOR DELETE
USING (profile_id = auth.uid());
