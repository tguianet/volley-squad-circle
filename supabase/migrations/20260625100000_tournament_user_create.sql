-- Permite que usuários autenticados publiquem torneios (como partidas amistosas)

DROP POLICY IF EXISTS "users create own tournaments" ON public.tournaments;

CREATE POLICY "users create own tournaments"
  ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
