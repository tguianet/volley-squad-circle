-- Feed social: bloqueio de contas suspensas, moderação staff, RPCs atômicos e notificações seguras.

CREATE OR REPLACE FUNCTION public.assert_user_not_suspended()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Faça login para continuar';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND COALESCE(is_suspended, false)
  ) THEN
    RAISE EXCEPTION 'Sua conta está suspensa';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_social_actor_allowed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.assert_user_not_suspended();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_social_ownership()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'gallery_photos' THEN
    IF NEW.user_id <> OLD.user_id THEN
      RAISE EXCEPTION 'O autor da publicacao nao pode ser alterado';
    END IF;
    IF NEW.created_at <> OLD.created_at AND NOT public.is_staff(auth.uid()) THEN
      RAISE EXCEPTION 'A data da publicacao nao pode ser alterada';
    END IF;
  ELSIF TG_TABLE_NAME = 'gallery_comments'
    AND (NEW.user_id <> OLD.user_id OR NEW.photo_id <> OLD.photo_id) THEN
    RAISE EXCEPTION 'O autor e a publicacao do comentario nao podem ser alterados';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_social_actor_gallery_photos ON public.gallery_photos;
CREATE TRIGGER enforce_social_actor_gallery_photos
  BEFORE INSERT OR UPDATE ON public.gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_social_actor_allowed();

DROP TRIGGER IF EXISTS enforce_social_actor_gallery_likes ON public.gallery_likes;
CREATE TRIGGER enforce_social_actor_gallery_likes
  BEFORE INSERT ON public.gallery_likes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_social_actor_allowed();

DROP TRIGGER IF EXISTS enforce_social_actor_gallery_comments ON public.gallery_comments;
CREATE TRIGGER enforce_social_actor_gallery_comments
  BEFORE INSERT OR UPDATE ON public.gallery_comments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_social_actor_allowed();

DROP TRIGGER IF EXISTS enforce_social_actor_post_shares ON public.post_shares;
CREATE TRIGGER enforce_social_actor_post_shares
  BEFORE INSERT ON public.post_shares
  FOR EACH ROW EXECUTE FUNCTION public.enforce_social_actor_allowed();

DROP POLICY IF EXISTS "Staff delete any photo" ON public.gallery_photos;
CREATE POLICY "Staff delete any photo"
  ON public.gallery_photos FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

DROP POLICY IF EXISTS "Staff delete any comment" ON public.gallery_comments;
CREATE POLICY "Staff delete any comment"
  ON public.gallery_comments FOR DELETE TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.toggle_gallery_like(p_photo_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_id uuid;
BEGIN
  PERFORM public.assert_user_not_suspended();

  IF NOT EXISTS (
    SELECT 1 FROM public.gallery_photos WHERE id = p_photo_id
  ) THEN
    RAISE EXCEPTION 'Publicacao nao encontrada';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_photo_id::text || ':' || auth.uid()::text, 0)
  );

  DELETE FROM public.gallery_likes
  WHERE photo_id = p_photo_id
    AND user_id = auth.uid()
  RETURNING id INTO v_deleted_id;

  IF v_deleted_id IS NOT NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.gallery_likes (photo_id, user_id)
  VALUES (p_photo_id, auth.uid());

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_gallery_comment(
  p_photo_id uuid,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content text := btrim(p_content);
  v_comment_id uuid;
BEGIN
  PERFORM public.assert_user_not_suspended();

  IF char_length(v_content) < 1 OR char_length(v_content) > 1000 THEN
    RAISE EXCEPTION 'Comentario invalido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.gallery_photos WHERE id = p_photo_id
  ) THEN
    RAISE EXCEPTION 'Publicacao nao encontrada';
  END IF;

  INSERT INTO public.gallery_comments (photo_id, user_id, content)
  VALUES (p_photo_id, auth.uid(), v_content)
  RETURNING id INTO v_comment_id;

  RETURN v_comment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.share_gallery_post(
  p_original_post_id uuid,
  p_comment text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment text := NULLIF(btrim(COALESCE(p_comment, '')), '');
  v_share_id uuid;
BEGIN
  PERFORM public.assert_user_not_suspended();

  IF v_comment IS NOT NULL
     AND (char_length(v_comment) < 1 OR char_length(v_comment) > 1000) THEN
    RAISE EXCEPTION 'Comentario de compartilhamento invalido';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.gallery_photos WHERE id = p_original_post_id
  ) THEN
    RAISE EXCEPTION 'Publicacao nao encontrada';
  END IF;

  INSERT INTO public.post_shares (original_post_id, shared_by_user_id, comment)
  VALUES (p_original_post_id, auth.uid(), v_comment)
  RETURNING id INTO v_share_id;

  RETURN v_share_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_notification_link()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.link_url IS NULL THEN
    RETURN NEW;
  END IF;

  IF length(NEW.link_url) > 500 THEN
    RAISE EXCEPTION 'link_url invalida';
  END IF;

  IF NEW.link_url !~ '^/' THEN
    RAISE EXCEPTION 'link_url invalida';
  END IF;

  IF NEW.link_url ~ '^//' THEN
    RAISE EXCEPTION 'link_url invalida';
  END IF;

  IF NEW.link_url ~ '\\' THEN
    RAISE EXCEPTION 'link_url invalida';
  END IF;

  IF NEW.link_url ~ '[[:cntrl:]]' THEN
    RAISE EXCEPTION 'link_url invalida';
  END IF;

  IF NEW.link_url ~* '^[a-z]+:' THEN
    RAISE EXCEPTION 'link_url invalida';
  END IF;

  IF NEW.link_url !~ '^/[A-Za-z0-9/_.$-]*$' THEN
    RAISE EXCEPTION 'link_url invalida';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_notification_link ON public.notifications;
CREATE TRIGGER validate_notification_link
  BEFORE INSERT OR UPDATE OF link_url ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.validate_notification_link();

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS event_key text;

COMMENT ON COLUMN public.notifications.event_key IS
  'Chave deterministica do evento para deduplicacao (ex.: gallery_like:<photo_id>:<actor_id>).';

DROP INDEX IF EXISTS public.notifications_unread_dedup_idx;
DROP INDEX IF EXISTS public.notifications_event_dedup_idx;
CREATE UNIQUE INDEX notifications_event_dedup_idx
  ON public.notifications (user_id, kind, event_key)
  WHERE event_key IS NOT NULL AND is_read = false;

CREATE OR REPLACE FUNCTION public.notify_gallery_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_actor_name text;
  v_event_key text := 'gallery_like:' || NEW.photo_id::text || ':' || NEW.user_id::text;
BEGIN
  SELECT gp.user_id, COALESCE(p.apelido, p.display_name, p.username, 'Alguem')
  INTO v_owner_id, v_actor_name
  FROM public.gallery_photos gp
  LEFT JOIN public.profiles p ON p.id = NEW.user_id
  WHERE gp.id = NEW.photo_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link_url, created_by, event_key)
  VALUES (
    v_owner_id,
    'like',
    'Nova curtida',
    v_actor_name || ' curtiu sua publicacao',
    '/',
    NEW.user_id,
    v_event_key
  )
  ON CONFLICT (user_id, kind, event_key)
    WHERE event_key IS NOT NULL AND is_read = false
  DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_gallery_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_actor_name text;
  v_event_key text := 'gallery_comment:' || NEW.id::text;
BEGIN
  SELECT gp.user_id, COALESCE(p.apelido, p.display_name, p.username, 'Alguem')
  INTO v_owner_id, v_actor_name
  FROM public.gallery_photos gp
  LEFT JOIN public.profiles p ON p.id = NEW.user_id
  WHERE gp.id = NEW.photo_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, kind, title, body, link_url, created_by, event_key)
  VALUES (
    v_owner_id,
    'comment',
    'Novo comentario',
    v_actor_name || ' comentou sua publicacao',
    '/',
    NEW.user_id,
    v_event_key
  )
  ON CONFLICT (user_id, kind, event_key)
    WHERE event_key IS NOT NULL AND is_read = false
  DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_gallery_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_event_key text := 'gallery_like:' || OLD.photo_id::text || ':' || OLD.user_id::text;
BEGIN
  SELECT gp.user_id
  INTO v_owner_id
  FROM public.gallery_photos gp
  WHERE gp.id = OLD.photo_id;

  IF v_owner_id IS NULL OR v_owner_id = OLD.user_id THEN
    RETURN OLD;
  END IF;

  DELETE FROM public.notifications
  WHERE user_id = v_owner_id
    AND kind = 'like'
    AND event_key = v_event_key
    AND is_read = false;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS notify_gallery_like ON public.gallery_likes;
CREATE TRIGGER notify_gallery_like
  AFTER INSERT ON public.gallery_likes
  FOR EACH ROW EXECUTE FUNCTION public.notify_gallery_like();

DROP TRIGGER IF EXISTS notify_gallery_comment ON public.gallery_comments;
CREATE TRIGGER notify_gallery_comment
  AFTER INSERT ON public.gallery_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_gallery_comment();

DROP TRIGGER IF EXISTS cleanup_gallery_like_notification ON public.gallery_likes;
CREATE TRIGGER cleanup_gallery_like_notification
  AFTER DELETE ON public.gallery_likes
  FOR EACH ROW EXECUTE FUNCTION public.cleanup_gallery_like_notification();

REVOKE ALL ON FUNCTION public.assert_user_not_suspended() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_gallery_like(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.add_gallery_comment(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.share_gallery_post(uuid, text) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.toggle_gallery_like(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_gallery_comment(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.share_gallery_post(uuid, text) FROM anon;

GRANT EXECUTE ON FUNCTION public.toggle_gallery_like(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_gallery_comment(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.share_gallery_post(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
