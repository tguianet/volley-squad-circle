import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { GalleryFeed } from "@/components/gallery-feed";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedStoriesStrip } from "@/components/feed/feed-stories-strip";
import { FeedSidebarRight } from "@/components/feed/feed-sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Feed — PlayBeach" },
      {
        name: "description",
        content: "Rede social do vôlei de areia: jogadores, arenas e torneios em um só lugar.",
      },
      { property: "og:title", content: "PlayBeach" },
      { property: "og:description", content: "Rede social do vôlei de areia." },
    ],
  }),
  component: Feed,
});

const FEED_QUERY_KEY = ["gallery_feed"] as const;

async function fetchMe() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name, apelido, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return data ? { ...data, id: user.id } : null;
}

function Feed() {
  const { data: me } = useQuery({ queryKey: ["me-feed-header"], queryFn: fetchMe });
  const firstName = (me?.display_name ?? "jogador").split(" ")[0];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[1180px] px-3 sm:px-5 py-5 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_248px] gap-5 lg:gap-8 items-start">
          <main className="min-w-0 w-full max-w-2xl mx-auto lg:max-w-none lg:mx-0 space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-3 px-0.5 lg:hidden">
              <h1 className="page-title text-2xl">Feed</h1>
              <Link to="/partidas/nova">
                <Button variant="beach" size="sm">
                  <Trophy className="size-4" />
                  Partida
                </Button>
              </Link>
            </div>

            <Card className="p-3 sm:p-4 border-border/60 shadow-card">
              <FeedStoriesStrip
                userId={me?.id ?? null}
                displayName={me?.display_name}
                avatarUrl={me?.avatar_url}
              />
            </Card>

            <FeedComposer
              userId={me?.id ?? null}
              profile={me}
              feedQueryKey={FEED_QUERY_KEY}
              placeholder={`E aí, ${firstName}? Conta como foi o treino...`}
            />

            <GalleryFeed />

            <div className="lg:hidden pt-1">
              <FeedSidebarRight />
            </div>
          </main>

          <aside className="hidden lg:block min-w-0">
            <FeedSidebarRight />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
