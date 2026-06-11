import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { duplas, quartetos, getPlayer, computeIndividualRanking } from "@/lib/mock-data";
import type { IndividualRankingRow } from "@/lib/mock-data";
import { Crown, Trophy, Medal, TrendingUp, Users, Mars, Venus, CalendarDays, MapPin } from "lucide-react";
import { useMemo, useState } from "react";
import { PlayerPreview } from "@/components/player-preview";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listScheduledChallenges } from "@/lib/ranking.functions";

type GenderFilter = "M" | "F" | "X";

export const Route = createFileRoute("/ranking/")({
  head: () => ({ meta: [{ title: "Ranking — BeachPlay Arena" }] }),
  component: RankingPage,
});

function RankingPage() {
  const [tab, setTab] = useState<"ind" | "dupla" | "quarteto">("ind");
  const [gender, setGender] = useState<GenderFilter>("M");

  // No tab Individual, Misto não é permitido — força para Masculino.
  const effectiveGender: GenderFilter = tab === "ind" && gender === "X" ? "M" : gender;

  const filteredDuplas = duplas.filter(d => d.gender === effectiveGender);
  const filteredQuartetos = quartetos.filter(q => q.gender === effectiveGender);

  const rankedIndividuals: IndividualRankingRow[] = useMemo(
    () => computeIndividualRanking(effectiveGender === "X" ? "M" : effectiveGender),
    [effectiveGender],
  );
  const rankedDuplas = [...filteredDuplas].sort((a,b) => b.rankingPoints - a.rankingPoints);
  const rankedQuartetos = [...filteredQuartetos].sort((a,b) => b.rankingPoints - a.rankingPoints);

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl">Ranking</h1>
        <p className="text-sm text-muted-foreground mb-4">Os melhores na areia.</p>

        <ToggleGroup
          type="single"
          value={effectiveGender}
          onValueChange={(v) => { if (v === "M" || v === "F" || v === "X") setGender(v); }}
          className="mb-4 justify-start"
        >
          <ToggleGroupItem value="M" aria-label="Masculino" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Mars className="size-4" />
            Masculino
          </ToggleGroupItem>
          <ToggleGroupItem value="F" aria-label="Feminino" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
            <Venus className="size-4" />
            Feminino
          </ToggleGroupItem>
          {tab !== "ind" && (
            <ToggleGroupItem value="X" aria-label="Misto" className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Users className="size-4" />
              Misto
            </ToggleGroupItem>
          )}
        </ToggleGroup>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "ind" | "dupla" | "quarteto")}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="ind">Individual</TabsTrigger>
            <TabsTrigger value="dupla">Duplas</TabsTrigger>
            <TabsTrigger value="quarteto">Quartetos</TabsTrigger>
          </TabsList>




          <TabsContent value="ind" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground px-1">
              Pontos agregados das modalidades coletivas (Duplas e Quartetos). Não há partidas individuais.
            </p>
            {rankedIndividuals.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum jogador nesta categoria ainda.</p>
            )}
            {rankedIndividuals.map((row, i) => {
              const p = row.player;
              const winRate = (row.winRate * 100).toFixed(0);
              return (
                <Card key={p.id} className="p-4 flex items-center gap-4 shadow-card hover:shadow-glow transition-shadow">
                  <div className={`size-10 rounded-full flex items-center justify-center font-display text-lg shrink-0 ${
                    i === 0 ? "gradient-beach text-white shadow-glow" :
                    i === 1 ? "bg-secondary text-foreground" :
                    i === 2 ? "bg-accent/30 text-accent-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {i === 0 ? <Crown className="size-5"/> : i+1}
                  </div>
                  <PlayerPreview player={p}>
                    <Avatar className="size-12 ring-2 ring-primary/30 cursor-pointer"><AvatarImage src={p.avatar}/><AvatarFallback>{p.name[0]}</AvatarFallback></Avatar>
                  </PlayerPreview>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {row.modalities.length > 0 ? row.modalities.join(" • ") : "Sem modalidades"}
                    </div>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-3 text-center text-xs">
                    <div><div className="font-display text-base text-success">{row.wins}</div><div className="text-muted-foreground">V</div></div>
                    <div><div className="font-display text-base text-destructive">{row.losses}</div><div className="text-muted-foreground">D</div></div>
                    <div><div className="font-display text-base text-primary">{winRate}%</div><div className="text-muted-foreground">Apr.</div></div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-2xl text-gradient">{row.points}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end"><Medal className="size-3"/>pts agregados</div>
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

        <ScheduledChallenges />
      </div>
    </AppLayout>
  );
}

function formatSunday(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ScheduledChallenges() {
  const fetchScheduled = useServerFn(listScheduledChallenges);
  const q = useQuery({
    queryKey: ["scheduled-challenges"],
    queryFn: () => fetchScheduled(),
  });
  const items = q.data ?? [];
  if (q.isLoading) return null;
  return (
    <div className="mt-8">
      <h2 className="text-xl font-display flex items-center gap-2">
        <CalendarDays className="size-5"/>Próximos desafios agendados
      </h2>
      <p className="text-xs text-muted-foreground mb-3">Sempre aos domingos.</p>
      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum desafio agendado no momento.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="font-semibold">
                Domingo {formatSunday(c.scheduled_date)} — {c.scheduled_time.slice(0, 5)}
              </div>
              <div className="text-sm">
                {c.challenger?.name} {c.challenger?.rank_position ? `(#${c.challenger.rank_position})` : ""}
                {" "}vs{" "}
                {c.challenged?.name} {c.challenged?.rank_position ? `(#${c.challenged.rank_position})` : ""}
              </div>
              {c.arena && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3"/>{c.arena.name}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
