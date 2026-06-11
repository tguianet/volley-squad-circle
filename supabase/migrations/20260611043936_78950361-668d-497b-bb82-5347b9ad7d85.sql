
-- Profiles: require auth to read (hides is_suspended/suspended_until from anonymous)
DROP POLICY IF EXISTS "profiles_public_read" ON public.profiles;
CREATE POLICY "profiles_authenticated_read"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.profiles FROM anon;

-- Challenges: require auth to read
DROP POLICY IF EXISTS "Challenges viewable by everyone" ON public.challenges;
CREATE POLICY "Challenges viewable by authenticated"
  ON public.challenges
  FOR SELECT
  TO authenticated
  USING (true);
REVOKE SELECT ON public.challenges FROM anon;
