import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Waves } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fetchGlobalFeed, fetchProfileFeed } from "@/lib/feed.queries";
import { FeedPostCard } from "@/components/feed/feed-post-card";
import { FeedShareCard } from "@/components/feed/feed-share-card";
import { FeedEmptyState } from "@/components/feed/feed-empty-state";

type FeedPostListProps = {
  mode: "global" | "profile";
  profileId?: string;
  queryKey: readonly unknown[];
};

export function FeedPostList({ mode, profileId, queryKey }: FeedPostListProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setAuthChecked(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const feedQ = useQuery({
    queryKey,
    enabled: authChecked && (mode === "global" || !!profileId),
    queryFn: () =>
      mode === "global"
        ? fetchGlobalFeed(userId)
        : fetchProfileFeed(profileId!, userId),
  });

  if (!authChecked || feedQ.isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (feedQ.isError) {
    return (
      <FeedEmptyState
        title="Não foi possível carregar"
        description="Tente atualizar a página em instantes."
        icon={Waves}
      />
    );
  }

  const items = feedQ.data ?? [];

  if (items.length === 0) {
    return (
      <FeedEmptyState
        title="Nenhuma publicação ainda"
        description={
          mode === "profile"
            ? "Quando este jogador publicar, aparecerá aqui."
            : "Seja o primeiro a compartilhar algo da areia!"
        }
        icon={Waves}
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) =>
        item.kind === "post" ? (
          <FeedPostCard
            key={`post-${item.post.id}`}
            post={item.post}
            userId={userId}
            feedQueryKey={queryKey}
          />
        ) : (
          <FeedShareCard
            key={`share-${item.share.id}`}
            share={item.share}
            userId={userId}
            feedQueryKey={queryKey}
          />
        ),
      )}
    </div>
  );
}
