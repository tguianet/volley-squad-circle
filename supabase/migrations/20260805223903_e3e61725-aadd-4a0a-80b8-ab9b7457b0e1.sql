-- Phase 2: least-privilege EXECUTE on public functions

-- 1) Drop blanket PUBLIC/anon/authenticated execute on non-trigger functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prorettype <> 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 2) Public (anon + authenticated) read-only helpers
GRANT EXECUTE ON FUNCTION public.court_availability(date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_sundays_of_month(date) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_available_sundays(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_court_availability(date, time without time zone, time without time zone, uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_challenge_by_rank(integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_ranking_complete(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_ranking_details(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_player_ranking_details(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile_by_username(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profile_follows(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profile_updates(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_profile_gallery(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_scheduled_challenges_public() TO anon, authenticated;

-- 3) Signed-in only
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_team_captain(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_challenge(uuid, date, time without time zone, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_challenge_score(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_challenge_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_challenge_score(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.follow_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unfollow_profile(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_follow_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_followed_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_followed_profiles_feed(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_profile_links() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_link_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_profile_link_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_profile_link_request(uuid, public.link_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_profiles(text, uuid) TO authenticated;

-- 4) Monthly rollover now runs inside the database (no public HTTP endpoint)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'playbeach-monthly-rollover';

SELECT cron.schedule(
  'playbeach-monthly-rollover',
  '0 3 1 * *',
  $cron$
    SELECT public.apply_previous_month_penalties();
    SELECT public.generate_current_month_availability();
  $cron$
);