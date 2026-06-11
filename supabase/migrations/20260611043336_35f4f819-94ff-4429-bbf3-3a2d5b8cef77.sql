
CREATE POLICY "Banners viewable by authenticated" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'banners');
CREATE POLICY "Users upload own banner" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own banner" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own banner" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners' AND auth.uid()::text = (storage.foldername(name))[1]);
