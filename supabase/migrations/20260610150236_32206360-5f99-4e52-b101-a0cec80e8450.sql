CREATE TABLE public.gallery_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id UUID NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX gallery_comments_photo_id_idx ON public.gallery_comments(photo_id, created_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_comments TO authenticated;
GRANT ALL ON public.gallery_comments TO service_role;

ALTER TABLE public.gallery_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view comments"
  ON public.gallery_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own comments"
  ON public.gallery_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.gallery_comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.gallery_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER set_gallery_comments_updated_at
  BEFORE UPDATE ON public.gallery_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();