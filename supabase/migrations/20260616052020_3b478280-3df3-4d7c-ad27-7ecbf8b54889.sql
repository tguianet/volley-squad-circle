GRANT EXECUTE ON FUNCTION public.apply_previous_month_penalties() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_current_month_availability() TO anon, authenticated;
NOTIFY pgrst, 'reload schema';