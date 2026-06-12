import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { GalleryFeed } from "@/components/gallery-feed";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Send } from "lucide-react";
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
      { name: "description", content: "Rede social do vôlei de areia: jogadores, arenas e torneios em um só lugar." },
      { property: "og:title", content: "PlayBeach" },
      { property: "og:description", content: "Rede social do vôlei de areia." },
    ],
  }),
  component: Feed,
});

async function fetchMe() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("display_name, apelido, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return data;
}

function Feed() {
  const { data: me } = useQuery({ queryKey: ["me-feed-header"], queryFn: fetchMe });
  const firstName = (me?.display_name ?? "jogador").split(" ")[0];

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="hidden md:flex items-center justify-between mb-2">
          <h1 className="text-3xl">Feed</h1>
          <Link to="/partidas/nova">
            <Button className="gradient-beach text-white shadow-glow border-0">+ Criar partida</Button>
          </Link>
        </div>

        <Card className="p-4 shadow-card">
          <div className="flex gap-3">
            <Avatar className="size-11 ring-2 ring-primary/30">
              <AvatarImage src={me?.avatar_url ?? undefined} />
              <AvatarFallback>{firstName[0]?.toUpperCase() ?? "?"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <input
                placeholder={`E aí, ${firstName}? Conta como foi o treino...`}
                className="w-full bg-secondary/60 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-primary"
              />
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1 text-muted-foreground">
                  <button className="flex items-center gap-1.5 text-xs hover:text-primary px-2 py-1 rounded-md"><ImageIcon className="size-4"/> Foto</button>
                  <button className="flex items-center gap-1.5 text-xs hover:text-primary px-2 py-1 rounded-md"><Video className="size-4"/> Vídeo</button>
                </div>
                <Button size="sm" className="gradient-beach text-white border-0"><Send className="size-3.5 mr-1"/> Postar</Button>
              </div>
            </div>
          </div>
        </Card>

        <GalleryFeed />
      </div>
    </AppLayout>
  );
}
