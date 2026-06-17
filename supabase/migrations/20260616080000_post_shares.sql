-- Compartilhamentos no feed (referência ao post original, sem duplicar mídia)

CREATE TABLE public.post_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_post_id uuid NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
  shared_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX post_shares_shared_by_created_idx
  ON public.post_shares(shared_by_user_id, created_at DESC);

CREATE INDEX post_shares_original_post_idx
  ON public.post_shares(original_post_id);

CREATE INDEX post_shares_created_idx
  ON public.post_shares(created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.post_shares TO authenticated;
GRANT ALL ON public.post_shares TO service_role;

ALTER TABLE public.post_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view post shares"
  ON public.post_shares FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users insert own post shares"
  ON public.post_shares FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = shared_by_user_id);

CREATE POLICY "Users delete own post shares"
  ON public.post_shares FOR DELETE TO authenticated
  USING (auth.uid() = shared_by_user_id);

NOTIFY pgrst, 'reload schema';
