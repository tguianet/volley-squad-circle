import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { GalleryFeed } from "@/components/gallery-feed";
import { FeedComposer } from "@/components/feed/feed-composer";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
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
        <div className="hidden md:flex items-center justify-between mb-1">
          <h1 className="text-2xl sm:text-3xl font-display font-bold">Feed</h1>
          <Link to="/partidas/nova">
            <Button className="gradient-beach text-white shadow-glow border-0">
              + Criar partida
            </Button>
          </Link>
        </div>

        <FeedComposer
          userId={me?.id ?? null}
          profile={me}
          feedQueryKey={FEED_QUERY_KEY}
          placeholder={`E aí, ${firstName}? Conta como foi o treino...`}
        />

        <GalleryFeed />
      </div>
    </AppLayout>
  );
}
