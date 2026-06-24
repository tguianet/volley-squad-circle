-- Arena principal do jogador no perfil

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS arena_id UUID REFERENCES public.arenas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_arena_id
  ON public.profiles (arena_id)
  WHERE arena_id IS NOT NULL;
