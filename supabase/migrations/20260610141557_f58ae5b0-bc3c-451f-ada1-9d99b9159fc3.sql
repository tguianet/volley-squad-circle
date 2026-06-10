
REVOKE EXECUTE ON FUNCTION public.handle_challenge_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_month_availability(DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_current_month_availability() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_monthly_penalties(DATE) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_previous_month_penalties() FROM PUBLIC;
