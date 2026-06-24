import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { GalleryFeed } from "@/components/gallery-feed";
import { FeedComposer } from "@/components/feed/feed-composer";
import { FeedStoriesStrip } from "@/components/feed/feed-stories-strip";
import { FeedSidebarLeft, FeedSidebarRight } from "@/components/feed/feed-sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Waves } from "lucide-react";

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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px] gap-5 xl:gap-6">
          <aside className="hidden lg:block">
            <FeedSidebarLeft />
          </aside>

          <main className="min-w-0 space-y-4">
            <Card className="p-4 sm:p-5 border-border/60 shadow-card overflow-hidden relative lg:hidden">
              <div className="absolute inset-0 gradient-beach opacity-[0.08] pointer-events-none" />
              <div className="relative flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
                    <Waves className="size-3.5" />
                    Rede social
                  </div>
                  <h1 className="page-title text-2xl">Feed da areia</h1>
                </div>
                <Link to="/partidas/nova">
                  <Button variant="beach" size="sm">
                    <Trophy className="size-4" />
                    Partida
                  </Button>
                </Link>
              </div>
            </Card>

            <div className="md:hidden flex items-center justify-between px-1">
              <h1 className="page-title text-2xl">Feed</h1>
              <Link to="/partidas/nova">
                <Button variant="beach" size="sm">
                  + Partida
                </Button>
              </Link>
            </div>

            <Card className="p-4 border-border/60 shadow-card">
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
          </main>

          <aside className="hidden lg:block">
            <FeedSidebarRight />
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
