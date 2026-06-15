-- =========================================================================
-- PROFILE LINKS SYSTEM
-- =========================================================================

-- Create enum for link status
DO $$ BEGIN
  CREATE TYPE public.link_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Create profile_links table
CREATE TABLE IF NOT EXISTS public.profile_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.link_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Prevent duplicate pending requests between same users
  CONSTRAINT unique_pending_link UNIQUE (requester_id, target_id, status),
  -- Prevent self-linking
  CHECK (requester_id <> target_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profile_links_requester ON public.profile_links(requester_id);
CREATE INDEX IF NOT EXISTS idx_profile_links_target ON public.profile_links(target_id);
CREATE INDEX IF NOT EXISTS idx_profile_links_status ON public.profile_links(status);
CREATE INDEX IF NOT EXISTS idx_profile_links_requester_status ON public.profile_links(requester_id, status);
CREATE INDEX IF NOT EXISTS idx_profile_links_target_status ON public.profile_links(target_id, status);

-- Grant permissions
GRANT SELECT ON public.profile_links TO authenticated, anon;
GRANT INSERT, UPDATE ON public.profile_links TO authenticated;
GRANT ALL ON public.profile_links TO service_role;

-- Enable RLS
ALTER TABLE public.profile_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile links"
  ON public.profile_links FOR SELECT TO authenticated
  USING (requester_id = auth.uid() OR target_id = auth.uid());

CREATE POLICY "Authenticated users can send link requests"
  ON public.profile_links FOR INSERT TO authenticated
  WITH CHECK (requester_id = auth.uid());

CREATE POLICY "Target user can respond to link requests"
  ON public.profile_links FOR UPDATE TO authenticated
  USING (target_id = auth.uid())
  WITH CHECK (target_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER trg_profile_links_updated_at
  BEFORE UPDATE ON public.profile_links
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================================
-- RPC FUNCTIONS
-- =========================================================================

-- Function to search profiles by name, username, email or whatsapp
CREATE OR REPLACE FUNCTION public.search_profiles(
  search_term TEXT,
  exclude_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  username TEXT,
  apelido TEXT,
  email TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  city TEXT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.display_name,
    p.username,
    p.apelido,
    p.email,
    p.whatsapp,
    p.avatar_url,
    p.city
  FROM public.profiles p
  WHERE 
    (exclude_id IS NULL OR p.id <> exclude_id)
    AND (
      p.display_name ILIKE ('%' || search_term || '%')
      OR p.username ILIKE ('%' || search_term || '%')
      OR p.apelido ILIKE ('%' || search_term || '%')
      OR p.email ILIKE ('%' || search_term || '%')
      OR p.whatsapp ILIKE ('%' || search_term || '%')
    )
    AND p.status = 'completo'
  ORDER BY p.display_name
  LIMIT 20;
END;
$$;

-- Function to send profile link request
CREATE OR REPLACE FUNCTION public.send_profile_link_request(
  p_target_id UUID
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_requester_id UUID := auth.uid();
  v_existing_id UUID;
  v_result JSON;
BEGIN
  -- Check if requester is trying to link to themselves
  IF v_requester_id = p_target_id THEN
    RETURN json_build_object('error', 'Cannot link to yourself');
  END IF;

  -- Check for existing pending request
  SELECT id INTO v_existing_id
  FROM public.profile_links
  WHERE 
    requester_id = v_requester_id 
    AND target_id = p_target_id 
    AND status = 'pending';
  
  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object('error', 'Pending request already exists');
  END IF;

  -- Check for existing accepted link
  SELECT id INTO v_existing_id
  FROM public.profile_links
  WHERE 
    requester_id = v_requester_id 
    AND target_id = p_target_id 
    AND status = 'accepted';
  
  IF v_existing_id IS NOT NULL THEN
    RETURN json_build_object('error', 'Profiles are already linked');
  END IF;

  -- Create the link request
  INSERT INTO public.profile_links (requester_id, target_id, status)
  VALUES (v_requester_id, p_target_id, 'pending')
  RETURNING id INTO v_existing_id;

  -- Send notification to target user
  INSERT INTO public.notifications (user_id, kind, title, body, link_url)
  SELECT 
    p_target_id,
    'profile_link_request',
    'Solicitação de vínculo de perfil',
    p.display_name || ' quer vincular o perfil a você.',
    '/perfil'
  FROM public.profiles
  WHERE id = v_requester_id;

  RETURN json_build_object('success', true, 'id', v_existing_id);
END;
$$;

-- Function to respond to profile link request
CREATE OR REPLACE FUNCTION public.respond_to_profile_link_request(
  p_link_id UUID,
  p_status public.link_status
)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_link RECORD;
  v_requester_id UUID;
  v_requester_name TEXT;
BEGIN
  -- Get the link request
  SELECT * INTO v_link
  FROM public.profile_links
  WHERE id = p_link_id AND target_id = v_user_id AND status = 'pending';
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Link request not found or already processed');
  END IF;

  -- Update the status
  UPDATE public.profile_links
  SET status = p_status
  WHERE id = p_link_id;

  -- If accepted, send notification to requester
  IF p_status = 'accepted' THEN
    SELECT requester_id INTO v_requester_id
    FROM public.profile_links
    WHERE id = p_link_id;
    
    SELECT display_name INTO v_requester_name
    FROM public.profiles
    WHERE id = v_user_id;
    
    INSERT INTO public.notifications (user_id, kind, title, body, link_url)
    VALUES (
      v_requester_id,
      'profile_link_accepted',
      'Vínculo de perfil aceito',
      v_requester_name || ' aceitou seu pedido de vínculo.',
      '/perfil'
    );
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to list user's profile links
CREATE OR REPLACE FUNCTION public.list_my_profile_links()
RETURNS TABLE (
  id UUID,
  linked_user_id UUID,
  linked_user_name TEXT,
  linked_user_apelido TEXT,
  linked_user_username TEXT,
  linked_user_avatar_url TEXT,
  linked_user_city TEXT,
  status public.link_status,
  created_at TIMESTAMPTZ,
  is_requester BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.id,
    CASE 
      WHEN pl.requester_id = auth.uid() THEN pl.target_id
      ELSE pl.requester_id
    END as linked_user_id,
    CASE 
      WHEN pl.requester_id = auth.uid() THEN p2.display_name
      ELSE p1.display_name
    END as linked_user_name,
    CASE 
      WHEN pl.requester_id = auth.uid() THEN p2.apelido
      ELSE p1.apelido
    END as linked_user_apelido,
    CASE 
      WHEN pl.requester_id = auth.uid() THEN p2.username
      ELSE p1.username
    END as linked_user_username,
    CASE 
      WHEN pl.requester_id = auth.uid() THEN p2.avatar_url
      ELSE p1.avatar_url
    END as linked_user_avatar_url,
    CASE 
      WHEN pl.requester_id = auth.uid() THEN p2.city
      ELSE p1.city
    END as linked_user_city,
    pl.status,
    pl.created_at,
    pl.requester_id = auth.uid() as is_requester
  FROM public.profile_links pl
  LEFT JOIN public.profiles p1 ON pl.requester_id = p1.id
  LEFT JOIN public.profiles p2 ON pl.target_id = p2.id
  WHERE 
    (pl.requester_id = auth.uid() OR pl.target_id = auth.uid())
    AND pl.status = 'accepted'
  ORDER BY pl.created_at DESC;
END;
$$;

-- Function to list pending link requests
CREATE OR REPLACE FUNCTION public.list_pending_link_requests()
RETURNS TABLE (
  id UUID,
  requester_id UUID,
  requester_name TEXT,
  requester_apelido TEXT,
  requester_username TEXT,
  requester_avatar_url TEXT,
  requester_city TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.id,
    pl.requester_id,
    p.display_name as requester_name,
    p.apelido as requester_apelido,
    p.username as requester_username,
    p.avatar_url as requester_avatar_url,
    p.city as requester_city,
    pl.created_at
  FROM public.profile_links pl
  JOIN public.profiles p ON pl.requester_id = p.id
  WHERE 
    pl.target_id = auth.uid()
    AND pl.status = 'pending'
  ORDER BY pl.created_at DESC;
END;
$$;

-- Grant execute permissions on RPC functions
GRANT EXECUTE ON FUNCTION public.search_profiles(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_profile_link_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_profile_link_request(UUID, link_status) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_my_profile_links() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_pending_link_requests() TO authenticated;
