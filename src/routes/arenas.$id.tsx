import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { getArena, getPlayer, tournaments, matches } from "@/lib/mock-data";
import { formatDateBR } from "@/lib/date-format";
import { ArrowLeft, MapPin, Star, Calendar, Trophy } from "lucide-react";

export const Route = createFileRoute("/arenas/$id")({
  head: () => ({ meta: [{ title: "Arena — BeachPlay Arena" }] }),
  component: ArenaDetail,
});

function ArenaDetail() {
  const { id } = useParams({ from: "/arenas/$id" });
  const a = getArena(id);
  if (!a) return <AppLayout><div className="p-8">Arena não encontrada.</div></AppLayout>;
  const arenaTournaments = tournaments.filter(t => t.arenaId === id);
  const arenaMatches = matches.filter(m => m.arenaId === id);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/arenas" className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"><ArrowLeft className="size-4"/> Arenas</Link>

        <div className="relative h-56 rounded-3xl overflow-hidden shadow-card mb-6">
          <img src={a.cover} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/>
          <div className="absolute bottom-0 p-6 text-white">
            <h1 className="font-display text-4xl">{a.name}</h1>
            <div className="flex flex-wrap gap-3 mt-1 text-sm">
              <span className="flex items-center gap-1"><MapPin className="size-4"/>{a.address} • {a.city}</span>
              <span className="flex items-center gap-1"><Star className="size-4 fill-accent text-accent"/>{a.rating}</span>
              <Badge className="bg-white/15 backdrop-blur text-white border-0">{a.courts} quadras</Badge>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {a.photos.map((p, i) => (
            <div key={i} className="aspect-square rounded-xl overflow-hidden shadow-card">
              <img src={p} className="w-full h-full object-cover"/>
            </div>
          ))}
        </div>

        <section className="mb-6">
          <h2 className="text-xl mb-3">Agenda</h2>
          <Card className="shadow-card divide-y">
            {arenaMatches.length === 0 && <div className="p-4 text-sm text-muted-foreground">Sem partidas marcadas.</div>}
            {arenaMatches.map(m => (
              <div key={m.id} className="p-4 flex items-center gap-3">
                <Calendar className="size-4 text-primary"/>
                <div className="flex-1 text-sm">
                  <div className="font-medium">{formatDateBR(m.date)} • {m.time}</div>
                  <div className="text-xs text-muted-foreground">{m.type} • {m.level}</div>
                </div>
                <Badge variant="secondary">{m.slotsTaken}/{m.slotsTotal}</Badge>
              </div>
            ))}
          </Card>
        </section>

        <section className="mb-6">
          <h2 className="text-xl mb-3">Torneios</h2>
          <div className="space-y-2">
            {arenaTournaments.map(t => (
              <Link key={t.id} to="/torneios/$id" params={{ id: t.id }}>
                <Card className="p-4 flex items-center gap-3 shadow-card hover:shadow-glow transition-shadow">
                  <Trophy className="size-5 text-accent"/>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.status} • {t.prize}</div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl mb-3">Jogadores frequentes</h2>
          <div className="flex flex-wrap gap-3">
            {a.frequentPlayers.map(pid => {
              const p = getPlayer(pid)!;
              return (
                <div key={pid} className="flex flex-col items-center gap-1.5 w-20">
                  <Avatar className="size-14 ring-2 ring-primary/30"><AvatarImage src={p.avatar}/><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                  <div className="text-[11px] text-center font-medium truncate w-full">{p.name.split(" ")[0]}</div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
