-- Add awaiting_confirmation status
ALTER TYPE challenge_status ADD VALUE IF NOT EXISTS 'awaiting_confirmation';

-- Add score columns
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS score_challenger INT,
  ADD COLUMN IF NOT EXISTS score_challenged INT,
  ADD COLUMN IF NOT EXISTS score_registered_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS score_confirmed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS score_confirmed_at TIMESTAMPTZ;