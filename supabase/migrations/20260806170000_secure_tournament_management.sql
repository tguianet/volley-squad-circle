-- Restringe a administração de torneios à equipe e valida dados no banco.

DROP POLICY IF EXISTS "users create own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "tournaments_admin_write" ON public.tournaments;
DROP POLICY IF EXISTS "staff manage tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "staff create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "staff update tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "staff delete tournaments" ON public.tournaments;

CREATE POLICY "staff create tournaments"
  ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'moderator')
    )
  );

CREATE POLICY "staff update tournaments"
  ON public.tournaments FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE POLICY "staff delete tournaments"
  ON public.tournaments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

CREATE OR REPLACE FUNCTION public.validate_tournament_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.title := btrim(NEW.title);
  NEW.category_label := btrim(NEW.category_label);

  IF NEW.title = '' OR length(NEW.title) > 120 THEN
    RAISE EXCEPTION 'Nome do torneio inválido';
  END IF;

  IF NEW.category_label = '' OR length(NEW.category_label) > 80 THEN
    RAISE EXCEPTION 'Categoria do torneio inválida';
  END IF;

  IF NEW.event_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'A data do torneio não pode estar no passado';
  END IF;

  IF NEW.max_teams < 2 OR NEW.max_teams > 128 THEN
    RAISE EXCEPTION 'A quantidade de vagas deve ficar entre 2 e 128';
  END IF;

  IF NEW.entry_fee_cents < 0 THEN
    RAISE EXCEPTION 'A taxa de inscrição não pode ser negativa';
  END IF;

  IF NEW.image_url IS NOT NULL
     AND NEW.image_url !~* '^https://[^[:space:]]+$' THEN
    RAISE EXCEPTION 'A imagem precisa usar uma URL HTTPS válida';
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_by := auth.uid();
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'O criador do torneio não pode ser alterado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tournament_write ON public.tournaments;
CREATE TRIGGER trg_validate_tournament_write
  BEFORE INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.validate_tournament_write();
