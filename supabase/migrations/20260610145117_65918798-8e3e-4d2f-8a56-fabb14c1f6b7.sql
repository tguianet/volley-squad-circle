
CREATE TABLE public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gallery_photos_user_id_idx ON public.gallery_photos(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view photos" ON public.gallery_photos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners insert their photos" ON public.gallery_photos
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners update their photos" ON public.gallery_photos
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their photos" ON public.gallery_photos
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER gallery_photos_set_updated_at
  BEFORE UPDATE ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.gallery_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id uuid NOT NULL REFERENCES public.gallery_photos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (photo_id, user_id)
);
CREATE INDEX gallery_likes_photo_id_idx ON public.gallery_likes(photo_id);

GRANT SELECT, INSERT, DELETE ON public.gallery_likes TO authenticated;
GRANT ALL ON public.gallery_likes TO service_role;
ALTER TABLE public.gallery_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view likes" ON public.gallery_likes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users add own likes" ON public.gallery_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own likes" ON public.gallery_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
