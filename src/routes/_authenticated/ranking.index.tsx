import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { CalendarDays, MapPin, Mars, Trophy, Users, Venus } from "lucide-react";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listScheduledChallenges } from "@/lib/ranking.functions";
import { RankingTable } from "@/components/ranking/ranking-table";
import {
  fetchIndividualRankingRows,
  fetchTeamRankingRows,
} from "@/lib/ranking.queries";

type GenderFilter = "M" | "F" | "X";
type RankingTab = "ind" | "dupla" | "quarteto";

export const Route = createFileRoute("/_authenticated/ranking/")({
  head: () => ({ meta: [{ title: "Ranking — PlayBeach" }] }),
  component: RankingPage,
});

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
        <CalendarDays className="size-5" />
        Próximos desafios agendados
      </h2>
      <p className="text-xs text-muted-foreground mb-3">Sempre aos domingos.</p>
      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground shadow-card">
          Nenhum desafio agendado no momento.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id} className="p-4 shadow-card">
              <div className="font-semibold">
                {c.scheduled_date ? `Domingo ${formatSunday(c.scheduled_date)}` : "A agendar"}
                {c.scheduled_time ? ` — ${c.scheduled_time.slice(0, 5)}` : ""}
              </div>
              <div className="text-sm">
                {c.challenger?.name}{" "}
                {c.challenger?.rank_position ? `(#${c.challenger.rank_position})` : ""} vs{" "}
                {c.challenged?.name}{" "}
                {c.challenged?.rank_position ? `(#${c.challenged.rank_position})` : ""}
              </div>
              {c.arena ? (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" />
                  {c.arena.name}
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function RankingPage() {
  const [tab, setTab] = useState<RankingTab>("ind");
  const [gender, setGender] = useState<GenderFilter>("M");
  const effectiveGender: GenderFilter = tab === "ind" && gender === "X" ? "M" : gender;

  const individualQ = useQuery({
    queryKey: ["ranking-individual-rows", effectiveGender],
    queryFn: () => fetchIndividualRankingRows(effectiveGender),
    enabled: tab === "ind",
  });

  const teamQ = useQuery({
    queryKey: ["ranking-team-rows", tab, effectiveGender],
    queryFn: () =>
      fetchTeamRankingRows(tab === "dupla" ? "dupla" : "quarteto", effectiveGender),
    enabled: tab === "dupla" || tab === "quarteto",
  });

  const emptyIndividual = "Ainda não há jogadores cadastrados no ranking.";
  const emptyTeams = "Nenhum time completo no ranking ainda.";

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <Card className="p-5 border-border/60 shadow-card overflow-hidden relative">
          <div className="absolute inset-0 gradient-ocean opacity-[0.06] pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
              <Trophy className="size-3.5" />
              Ranking oficial
            </div>
            <h1 className="page-title">Ranking</h1>
            <p className="text-sm text-muted-foreground mt-1">Os melhores na areia de Rio Preto.</p>
          </div>
        </Card>

        <ToggleGroup
          type="single"
          value={effectiveGender}
          onValueChange={(v) => {
            if (v === "M" || v === "F" || v === "X") setGender(v);
          }}
          className="mb-4 justify-start flex-wrap"
        >
          <ToggleGroupItem
            value="M"
            className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Mars className="size-4" /> Masculino
          </ToggleGroupItem>
          <ToggleGroupItem
            value="F"
            className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Venus className="size-4" /> Feminino
          </ToggleGroupItem>
          {tab !== "ind" ? (
            <ToggleGroupItem
              value="X"
              className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Users className="size-4" /> Misto
            </ToggleGroupItem>
          ) : null}
        </ToggleGroup>

        <Tabs value={tab} onValueChange={(v) => setTab(v as RankingTab)}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="ind">Individual</TabsTrigger>
            <TabsTrigger value="dupla">Duplas</TabsTrigger>
            <TabsTrigger value="quarteto">Quartetos</TabsTrigger>
          </TabsList>

          <TabsContent value="ind" className="mt-4">
            <RankingTable
              rows={individualQ.data ?? []}
              isLoading={individualQ.isLoading}
              emptyMessage={emptyIndividual}
            />
          </TabsContent>

          <TabsContent value="dupla" className="mt-4">
            <RankingTable
              rows={teamQ.data ?? []}
              isLoading={teamQ.isLoading}
              emptyMessage={emptyTeams}
            />
          </TabsContent>

          <TabsContent value="quarteto" className="mt-4">
            <RankingTable
              rows={teamQ.data ?? []}
              isLoading={teamQ.isLoading}
              emptyMessage={emptyTeams}
            />
          </TabsContent>
        </Tabs>

        <ScheduledChallenges />
      </div>
    </AppLayout>
  );
}
