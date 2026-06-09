import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getTournament, getArena, getDupla, getPlayer, duplas as allDuplas } from "@/lib/mock-data";
import { ArrowLeft, Calendar, MapPin, Trophy, Crown } from "lucide-react";

export const Route = createFileRoute("/torneios/$id")({
  head: () => ({ meta: [{ title: "Torneio — BeachPlay Arena" }] }),
  component: TournamentDetail,
});

function TournamentDetail() {
  const { id } = useParams({ from: "/torneios/$id" });
  const t = getTournament(id);
  if (!t) return <AppLayout><div className="p-8">Torneio não encontrado.</div></AppLayout>;
  const arena = getArena(t.arenaId);
  const inscritas = t.duplas.map(getDupla).filter(Boolean) as NonNullable<ReturnType<typeof getDupla>>[];
  // mock bracket using allDuplas
  const semis = allDuplas.slice(0, 4);
  const champ = allDuplas[0];

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/torneios" className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"><ArrowLeft className="size-4"/> Torneios</Link>

        <div className="relative h-56 rounded-3xl overflow-hidden shadow-card mb-6">
          <img src={t.cover} className="w-full h-full object-cover"/>
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30"/>
          <div className="absolute bottom-0 p-6 text-white">
            <Badge className="bg-accent text-white border-0 mb-2">{t.status}</Badge>
            <h1 className="text-4xl font-display">{t.name}</h1>
            <div className="flex flex-wrap gap-3 text-sm mt-2 opacity-90">
              <span className="flex items-center gap-1"><MapPin className="size-4"/>{arena?.name}</span>
              <span className="flex items-center gap-1"><Calendar className="size-4"/>{new Date(t.startDate).toLocaleDateString("pt-BR")}</span>
              <span className="flex items-center gap-1"><Trophy className="size-4"/>{t.prize}</span>
            </div>
          </div>
        </div>

        <section className="mb-6">
          <h2 className="text-xl mb-3">Duplas inscritas</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {inscritas.map(d => {
              const p1 = getPlayer(d.player1Id)!;
              const p2 = getPlayer(d.player2Id)!;
              return (
                <Card key={d.id} className="p-3 flex items-center gap-3 shadow-card">
                  <div className="flex -space-x-2">
                    <Avatar className="size-9 ring-2 ring-background"><AvatarImage src={p1.avatar}/><AvatarFallback>{p1.name[0]}</AvatarFallback></Avatar>
                    <Avatar className="size-9 ring-2 ring-background"><AvatarImage src={p2.avatar}/><AvatarFallback>{p2.name[0]}</AvatarFallback></Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{d.rankingPoints} pts</div>
                  </div>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-xl mb-3">Fase de grupos</h2>
          <Card className="shadow-card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-xs uppercase tracking-wide">
                <tr><th className="text-left p-3">Dupla</th><th className="p-3">J</th><th className="p-3">V</th><th className="p-3">D</th><th className="p-3">Pts</th></tr>
              </thead>
              <tbody>
                {inscritas.map((d, i) => (
                  <tr key={d.id} className="border-t">
                    <td className="p-3 font-medium">{i+1}. {d.name}</td>
                    <td className="p-3 text-center">{d.wins + d.losses}</td>
                    <td className="p-3 text-center text-success">{d.wins}</td>
                    <td className="p-3 text-center text-destructive">{d.losses}</td>
                    <td className="p-3 text-center font-semibold">{d.rankingPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>

        <section className="mb-6">
          <h2 className="text-xl mb-3">Semifinais & Final</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <Card className="p-4 shadow-card">
              <div className="text-xs text-muted-foreground mb-2">Semifinal 1</div>
              <BracketLine name={semis[0].name} score="2" winner/>
              <BracketLine name={semis[1].name} score="1"/>
            </Card>
            <Card className="p-4 shadow-card">
              <div className="text-xs text-muted-foreground mb-2">Semifinal 2</div>
              <BracketLine name={semis[2].name} score="0"/>
              <BracketLine name={semis[3].name} score="2" winner/>
            </Card>
            <Card className="p-4 shadow-card gradient-beach text-white">
              <div className="text-xs opacity-80 mb-2">Final</div>
              <BracketLine name={semis[0].name} score="2" winner light/>
              <BracketLine name={semis[3].name} score="1" light/>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-xl mb-3">Campeões</h2>
          <Card className="p-6 shadow-glow flex items-center gap-4 gradient-sand">
            <div className="size-14 rounded-full gradient-beach flex items-center justify-center shadow-glow">
              <Crown className="size-7 text-white"/>
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Atual campeão</div>
              <div className="font-display text-2xl">{champ.name}</div>
              <div className="text-xs text-muted-foreground">{champ.rankingPoints} pts no ranking</div>
            </div>
            <Trophy className="size-12 text-accent"/>
          </Card>
        </section>
      </div>
    </AppLayout>
  );
}

function BracketLine({ name, score, winner, light }: { name: string; score: string; winner?: boolean; light?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1.5 text-sm ${winner ? "font-bold" : light ? "opacity-70" : "text-muted-foreground"}`}>
      <span className="truncate">{name}</span>
      <span className={`tabular-nums ml-2 px-2 rounded ${winner && !light ? "bg-success text-white" : ""}`}>{score}</span>
    </div>
  );
}
