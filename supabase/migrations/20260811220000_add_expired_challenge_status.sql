-- Kept separate because PostgreSQL enum values must be committed before use.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = 'public.challenge_status'::regtype
      AND enumlabel = 'expired'
  ) THEN
    ALTER TYPE public.challenge_status ADD VALUE 'expired';
  END IF;
END;
$$;
