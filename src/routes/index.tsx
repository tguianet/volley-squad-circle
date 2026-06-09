import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Share2, Image as ImageIcon, Video, Send, BadgeCheck } from "lucide-react";
import { posts, getPlayer, getArena, getTournament, currentUser } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Feed — BeachPlay Arena" },
      { name: "description", content: "Rede social do vôlei de areia: jogadores, arenas e torneios em um só lugar." },
      { property: "og:title", content: "BeachPlay Arena" },
      { property: "og:description", content: "Rede social do vôlei de areia." },
    ],
  }),
  component: Feed,
});

function authorInfo(p: typeof posts[number]) {
  if (p.authorType === "player") {
    const pl = getPlayer(p.authorId);
    return pl && { name: pl.name, sub: pl.city, avatar: pl.avatar, verified: pl.level === "Profissional" };
  }
  if (p.authorType === "arena") {
    const a = getArena(p.authorId);
    return a && { name: a.name, sub: `Arena • ${a.city}`, avatar: a.cover, verified: true };
  }
  const t = getTournament(p.authorId);
  return t && { name: t.name, sub: `Torneio • ${t.category}`, avatar: t.cover, verified: true };
}

function Feed() {
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <div className="hidden md:flex items-center justify-between mb-2">
          <h1 className="text-3xl">Feed</h1>
          <Link to="/partidas/nova"><Button className="gradient-beach text-white shadow-glow border-0">+ Criar partida</Button></Link>
        </div>

        {/* Composer */}
        <Card className="p-4 shadow-card">
          <div className="flex gap-3">
            <Avatar className="size-11 ring-2 ring-primary/30">
              <AvatarImage src={currentUser.avatar} />
              <AvatarFallback>EU</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <input
                placeholder={`E aí, ${currentUser.name.split(" ")[0]}? Conta como foi o treino...`}
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

        {posts.map((p) => {
          const a = authorInfo(p);
          if (!a) return null;
          const isLiked = liked[p.id];
          return (
            <Card key={p.id} className="overflow-hidden shadow-card">
              <div className="flex items-center gap-3 p-4">
                <Avatar className="size-11 ring-2 ring-accent/40">
                  <AvatarImage src={a.avatar} />
                  <AvatarFallback>{a.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm">{a.name}</span>
                    {a.verified && <BadgeCheck className="size-4 text-primary" />}
                  </div>
                  <div className="text-xs text-muted-foreground">{a.sub} • {p.createdAt}</div>
                </div>
              </div>
              <p className="px-4 pb-3 text-sm leading-relaxed">{p.content}</p>
              {p.image && (
                <div className="aspect-[4/3] w-full bg-secondary overflow-hidden">
                  <img src={p.image} alt="" className="w-full h-full object-cover"/>
                </div>
              )}
              <div className="flex items-center gap-1 p-2 border-t">
                <button onClick={() => setLiked(s => ({...s, [p.id]: !s[p.id]}))}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-secondary text-sm">
                  <Heart className={`size-4 ${isLiked ? "fill-accent text-accent" : ""}`} />
                  <span>{p.likes + (isLiked ? 1 : 0)}</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-secondary text-sm">
                  <MessageCircle className="size-4" /> <span>{p.comments.length}</span>
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-secondary text-sm ml-auto">
                  <Share2 className="size-4" /> <span className="hidden sm:inline">Compartilhar</span>
                </button>
              </div>
              {p.comments.length > 0 && (
                <div className="px-4 py-3 border-t bg-secondary/40 space-y-1.5">
                  {p.comments.slice(0,2).map((c, i) => (
                    <div key={i} className="text-xs"><span className="font-semibold">{c.user}</span> <span className="text-muted-foreground">{c.text}</span></div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </AppLayout>
  );
}
