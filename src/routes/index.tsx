import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { GalleryFeed } from "@/components/gallery-feed";
import { FeedComposer } from "@/components/feed/feed-composer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Users, Waves } from "lucide-react";

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
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-5 sm:py-6 space-y-4">
        <div className="hidden md:block">
          <Card className="p-5 border-border/60 shadow-card overflow-hidden relative">
            <div className="absolute inset-0 gradient-beach opacity-[0.07] pointer-events-none" />
            <div className="relative flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                  <Waves className="size-3.5" />
                  Rede social
                </div>
                <h1 className="page-title">Feed da areia</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Treinos, partidas e novidades da comunidade PlayBeach.
                </p>
              </div>
              <Link to="/partidas/nova">
                <Button variant="beach" className="shrink-0">
                  <Trophy className="size-4" />
                  Criar partida
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        <div className="md:hidden flex items-center justify-between">
          <h1 className="page-title text-2xl">Feed</h1>
          <Link to="/partidas/nova">
            <Button variant="beach" size="sm">
              + Partida
            </Button>
          </Link>
        </div>

        <FeedComposer
          userId={me?.id ?? null}
          profile={me}
          feedQueryKey={FEED_QUERY_KEY}
          placeholder={`E aí, ${firstName}? Conta como foi o treino...`}
        />

        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <Users className="size-3.5" />
          Publicações recentes da comunidade
        </div>

        <GalleryFeed />
      </div>
    </AppLayout>
  );
}
