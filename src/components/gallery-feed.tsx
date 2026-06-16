import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FeedPostList } from "@/components/feed/feed-post-list";

const FEED_QUERY_KEY = ["gallery_feed"] as const;

export function GalleryFeed() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(() => setAuthChecked(true));
    const { data: sub } = supabase.auth.onAuthStateChange(() => setAuthChecked(true));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!authChecked) return null;

  return <FeedPostList mode="global" queryKey={FEED_QUERY_KEY} />;
}
