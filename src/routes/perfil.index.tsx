import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { currentUser, duplas, getPlayer, recentMatches } from "@/lib/mock-data";
import { MapPin, Ruler, Hand, ArrowLeftRight, Trophy, Settings } from "lucide-react";

export const Route = createFileRoute("/perfil/")({
  head: () => ({ meta: [{ title: "Perfil — BeachPlay Arena" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const p = currentUser;
  const dupla = duplas.find(d => d.player1Id === p.id || d.player2Id === p.id);
  const partner = dupla ? getPlayer(dupla.player1Id === p.id ? dupla.player2Id : dupla.player1Id) : null;
  const winRate = ((p.wins / p.matches) * 100).toFixed(0);
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        <Card className="overflow-hidden shadow-card">
          <div className="h-32 gradient-ocean relative">
            <div className="absolute -bottom-12 left-6">
              <Avatar className="size-24 ring-4 ring-background shadow-glow">
                <AvatarImage src={p.avatar}/>
                <AvatarFallback>{p.name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <Button size="sm" variant="secondary" className="absolute top-3 right-3"><Settings className="size-4 mr-1"/>Editar</Button>
          </div>
          <div className="pt-16 px-6 pb-6">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <h1 className="font-display text-3xl leading-none">{p.name}</h1>
                <div className="text-sm text-muted-foreground">{p.username}</div>
              </div>
              <Badge className="gradient-beach text-white border-0 ml-auto">{p.level}</Badge>
            </div>
            <p className="text-sm mt-3">{p.bio}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-xs">
              <Info icon={MapPin} label="Cidade" value={p.city}/>
              <Info icon={Ruler} label="Altura" value={`${p.height} cm`}/>
              <Info icon={Hand} label="Mão" value={p.dominantHand}/>
              <Info icon={ArrowLeftRight} label="Lado" value={p.preferredSide}/>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Ranking" value={p.rankingPoints} sub={`#${1}`} accent/>
          <Stat label="Vitórias" value={p.wins} sub={`${winRate}% apr.`}/>
          <Stat label="Derrotas" value={p.losses}/>
          <Stat label="MVPs" value={p.mvps} sub={`${p.matches} jogos`}/>
        </div>

        {/* Dupla */}
        {dupla && partner && (
          <Card className="p-5 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg">Dupla fixa</h2>
              <Badge variant="secondary">#{1} ranking</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                <Avatar className="size-12 ring-2 ring-background"><AvatarImage src={p.avatar}/></Avatar>
                <Avatar className="size-12 ring-2 ring-background"><AvatarImage src={partner.avatar}/></Avatar>
              </div>
              <div className="flex-1">
                <div className="font-display text-xl">{dupla.name}</div>
                <div className="text-xs text-muted-foreground">Desde {new Date(dupla.formedAt).toLocaleDateString("pt-BR")}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div><div className="font-display text-lg text-success">{dupla.wins}</div><div className="text-muted-foreground">V</div></div>
                <div><div className="font-display text-lg text-destructive">{dupla.losses}</div><div className="text-muted-foreground">D</div></div>
                <div><div className="font-display text-lg text-primary">{dupla.rankingPoints}</div><div className="text-muted-foreground">pts</div></div>
              </div>
            </div>
          </Card>
        )}

        {/* Histórico */}
        <Card className="p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg">Histórico recente</h2>
            <Link to="/h2h" className="text-xs text-primary font-semibold">Comparar H2H →</Link>
          </div>
          <div className="space-y-2">
            {recentMatches.map(m => (
              <div key={m.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <div className={`size-8 rounded-lg flex items-center justify-center font-display text-sm ${m.result === "V" ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}>{m.result}</div>
                <div className="flex-1">
                  <div className="text-sm font-medium">vs {m.opponent}</div>
                  <div className="text-xs text-muted-foreground">{m.date}</div>
                </div>
                <div className="text-xs font-mono tabular-nums text-muted-foreground">{m.score}</div>
              </div>
            ))}
          </div>
        </Card>

        <Link to="/auth"><Button variant="outline" className="w-full">Sair</Button></Link>
      </div>
    </AppLayout>
  );
}

function Info({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/60">
      <Icon className="size-4 text-primary shrink-0"/>
      <div className="min-w-0">
        <div className="text-[10px] uppercase text-muted-foreground tracking-wide">{label}</div>
        <div className="text-sm font-semibold truncate">{value}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <Card className={`p-4 shadow-card ${accent ? "gradient-beach text-white" : ""}`}>
      <div className={`text-xs uppercase tracking-wide ${accent ? "opacity-80" : "text-muted-foreground"}`}>{label}</div>
      <div className="font-display text-3xl leading-none mt-1">{value}</div>
      {sub && <div className={`text-[10px] mt-1 ${accent ? "opacity-80" : "text-muted-foreground"}`}>{sub}</div>}
    </Card>
  );
}
