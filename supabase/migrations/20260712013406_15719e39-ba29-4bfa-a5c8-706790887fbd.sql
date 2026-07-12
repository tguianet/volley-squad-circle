CREATE TABLE public.stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);

CREATE INDEX stories_active_idx ON public.stories (expires_at DESC);
CREATE INDEX stories_user_idx ON public.stories (user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active stories"
  ON public.stories FOR SELECT TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users can create own stories"
  ON public.stories FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON public.stories FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage policies for stories folder in gallery bucket
CREATE POLICY "Users can upload own stories to gallery"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = 'stories'
    AND (storage.foldername(name))[2] = auth.uid()::text
  );

CREATE POLICY "Authenticated can read stories from gallery"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'gallery'
    AND (storage.foldername(name))[1] = 'stories'
  );