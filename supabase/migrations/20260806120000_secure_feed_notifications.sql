-- Protege o feed e as notificacoes contra alteracoes diretas pela API.

ALTER TABLE public.gallery_photos
  DROP CONSTRAINT IF EXISTS gallery_photos_description_length_check;
ALTER TABLE public.gallery_photos
  ADD CONSTRAINT gallery_photos_description_length_check
  CHECK (description IS NULL OR length(description) <= 2000);

ALTER TABLE public.gallery_comments
  DROP CONSTRAINT IF EXISTS gallery_comments_content_check;
ALTER TABLE public.gallery_comments
  ADD CONSTRAINT gallery_comments_content_check
  CHECK (length(trim(content)) BETWEEN 1 AND 1000);

ALTER TABLE public.post_shares
  DROP CONSTRAINT IF EXISTS post_shares_comment_check;
ALTER TABLE public.post_shares
  ADD CONSTRAINT post_shares_comment_check
  CHECK (comment IS NULL OR length(trim(comment)) BETWEEN 1 AND 1000);

CREATE OR REPLACE FUNCTION public.protect_social_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'gallery_photos' AND NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'O autor da publicacao nao pode ser alterado';
  ELSIF TG_TABLE_NAME = 'gallery_comments'
    AND (NEW.user_id <> OLD.user_id OR NEW.photo_id <> OLD.photo_id) THEN
    RAISE EXCEPTION 'O autor e a publicacao do comentario nao podem ser alterados';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_gallery_photo_ownership ON public.gallery_photos;
CREATE TRIGGER protect_gallery_photo_ownership
  BEFORE UPDATE ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.protect_social_ownership();

DROP TRIGGER IF EXISTS protect_gallery_comment_ownership ON public.gallery_comments;
CREATE TRIGGER protect_gallery_comment_ownership
  BEFORE UPDATE ON public.gallery_comments
  FOR EACH ROW EXECUTE FUNCTION public.protect_social_ownership();

DROP POLICY IF EXISTS notifications_self_update ON public.notifications;
REVOKE UPDATE ON public.notifications FROM authenticated;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true
  WHERE id = p_notification_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificacao nao encontrada';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.notifications SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
$$;

CREATE OR REPLACE FUNCTION public.delete_own_notification(p_notification_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE id = p_notification_id AND user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Notificacao nao encontrada';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_own_notification(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_own_notification(uuid) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
