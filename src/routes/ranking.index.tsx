import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { players, duplas, quartetos, getPlayer } from "@/lib/mock-data";
import { Crown, Trophy, Medal, TrendingUp, Users } from "lucide-react";


export const Route = createFileRoute("/ranking/")({
  head: () => ({ meta: [{ title: "Ranking — BeachPlay Arena" }] }),
  component: RankingPage,
});

function RankingPage() {
  const rankedPlayers = [...players].sort((a,b) => b.rankingPoints - a.rankingPoints);
  const rankedDuplas = [...duplas].sort((a,b) => b.rankingPoints - a.rankingPoints);
  const rankedQuartetos = [...quartetos].sort((a,b) => b.rankingPoints - a.rankingPoints);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl">Ranking</h1>
        <p className="text-sm text-muted-foreground mb-6">Os melhores na areia.</p>

        <Tabs defaultValue="ind">
          <TabsList className="bg-secondary">
            <TabsTrigger value="ind">Individual</TabsTrigger>
            <TabsTrigger value="dupla">Duplas</TabsTrigger>
            <TabsTrigger value="quarteto">Quartetos</TabsTrigger>
          </TabsList>


          <TabsContent value="ind" className="mt-4 space-y-3">
            {rankedPlayers.map((p, i) => {
              const winRate = ((p.wins / p.matches) * 100).toFixed(0);
              return (
                <Card key={p.id} className="p-4 flex items-center gap-4 shadow-card hover:shadow-glow transition-shadow">
                  <div className={`size-10 rounded-full flex items-center justify-center font-display text-lg shrink-0 ${
                    i === 0 ? "gradient-beach text-white shadow-glow" :
                    i === 1 ? "bg-secondary text-foreground" :
                    i === 2 ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {i === 0 ? <Crown className="size-5"/> : i+1}
                  </div>
                  <Avatar className="size-12 ring-2 ring-primary/30"><AvatarImage src={p.avatar}/><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground">{p.city} • {p.level}</div>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-3 text-center text-xs">
                    <div><div className="font-display text-base text-success">{p.wins}</div><div className="text-muted-foreground">V</div></div>
                    <div><div className="font-display text-base text-destructive">{p.losses}</div><div className="text-muted-foreground">D</div></div>
                    <div><div className="font-display text-base text-primary">{winRate}%</div><div className="text-muted-foreground">Apr.</div></div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-2xl text-gradient">{p.rankingPoints}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><Medal className="size-3"/>{p.mvps} MVPs</div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="dupla" className="mt-4 space-y-3">
            {rankedDuplas.map((d, i) => {
              const p1 = getPlayer(d.player1Id)!;
              const p2 = getPlayer(d.player2Id)!;
              return (
                <Card key={d.id} className="p-4 flex items-center gap-4 shadow-card">
                  <div className={`size-10 rounded-full flex items-center justify-center font-display text-lg shrink-0 ${
                    i === 0 ? "gradient-beach text-white" : "bg-secondary"
                  }`}>{i === 0 ? <Trophy className="size-5"/> : i+1}</div>
                  <div className="flex -space-x-3">
                    <Avatar className="size-11 ring-2 ring-background"><AvatarImage src={p1.avatar}/><AvatarFallback>{p1.name[0]}</AvatarFallback></Avatar>
                    <Avatar className="size-11 ring-2 ring-background"><AvatarImage src={p2.avatar}/><AvatarFallback>{p2.name[0]}</AvatarFallback></Avatar>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{d.name}</div>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{d.wins}V — {d.losses}D</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl text-gradient">{d.rankingPoints}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><TrendingUp className="size-3"/>pts</div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="quarteto" className="mt-4 space-y-3">
            {rankedQuartetos.map((q, i) => {
              const ps = q.playerIds.map(id => getPlayer(id)!).filter(Boolean);
              const total = q.wins + q.losses;
              const winRate = total ? ((q.wins / total) * 100).toFixed(0) : "0";
              return (
                <Card key={q.id} className="p-4 flex items-center gap-4 shadow-card">
                  <div className={`size-10 rounded-full flex items-center justify-center font-display text-lg shrink-0 ${
                    i === 0 ? "gradient-beach text-white shadow-glow" : "bg-secondary"
                  }`}>{i === 0 ? <Users className="size-5"/> : i+1}</div>
                  <div className="flex -space-x-3">
                    {ps.map(p => (
                      <Avatar key={p.id} className="size-10 ring-2 ring-background">
                        <AvatarImage src={p.avatar}/>
                        <AvatarFallback>{p.name[0]}</AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{q.name}</div>
                    <Badge variant="secondary" className="text-[10px] mt-0.5">{q.wins}V — {q.losses}D • {winRate}%</Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl text-gradient">{q.rankingPoints}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><TrendingUp className="size-3"/>pts</div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>

      </div>
    </AppLayout>
  );
}
