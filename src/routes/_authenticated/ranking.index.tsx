import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Mars, Trophy, Users, Venus } from "lucide-react";
import { RankingTable } from "@/components/ranking/ranking-table";
import { RankingSidebar } from "@/components/ranking/ranking-sidebar";
import {
  fetchIndividualRankingRows,
  fetchTeamRankingRows,
} from "@/lib/ranking.queries";
import { buildRankingAnalytics } from "@/lib/ranking.types";
import { cn } from "@/lib/utils";

type GenderFilter = "M" | "F" | "X";
type RankingTab = "ind" | "dupla" | "quarteto";

export const Route = createFileRoute("/_authenticated/ranking/")({
  head: () => ({ meta: [{ title: "Ranking — PlayBeach" }] }),
  component: RankingPage,
});

const TAB_LABELS: Record<RankingTab, string> = {
  ind: "Individual",
  dupla: "Duplas",
  quarteto: "Quartetos",
};

function GenderPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-5 py-2 rounded-full text-sm font-semibold transition-all border",
        active
          ? "border-primary bg-primary/10 text-primary shadow-sm"
          : "border-border/60 bg-card text-muted-foreground hover:text-foreground hover:border-border",
      )}
    >
      {children}
    </button>
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

  const activeRows = tab === "ind" ? (individualQ.data ?? []) : (teamQ.data ?? []);
  const isLoading = tab === "ind" ? individualQ.isLoading : teamQ.isLoading;
  const analytics = useMemo(() => buildRankingAnalytics(activeRows), [activeRows]);

  const emptyIndividual = "Ainda não há jogadores cadastrados no ranking.";
  const emptyTeams = "Nenhum time completo no ranking ainda.";
  const emptyMessage = tab === "ind" ? emptyIndividual : emptyTeams;

  const genderLabel =
    effectiveGender === "F" ? "Feminino" : effectiveGender === "X" ? "Misto" : "Masculino";

  return (
    <AppLayout>
      <Tabs value={tab} onValueChange={(v) => setTab(v as RankingTab)}>
        <div className="mx-auto w-full max-w-[1280px] px-3 sm:px-5 py-5 sm:py-8">
          <section className="mb-6 sm:mb-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-primary mb-2 block">
                  PlayBeach Official
                </span>
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl leading-[1.05] tracking-wide">
                  RANKING DE
                  <br />
                  <span className="text-gradient italic">VÔLEI DE PRAIA</span>
                </h1>
                <p className="text-sm text-muted-foreground mt-2">
                  {TAB_LABELS[tab]} · {genderLabel} · Rio Preto
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <GenderPill active={effectiveGender === "M"} onClick={() => setGender("M")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Mars className="size-4" /> Masculino
                  </span>
                </GenderPill>
                <GenderPill active={effectiveGender === "F"} onClick={() => setGender("F")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Venus className="size-4" /> Feminino
                  </span>
                </GenderPill>
                <GenderPill active={effectiveGender === "X"} onClick={() => setGender("X")}>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="size-4" /> Misto
                  </span>
                </GenderPill>
              </div>
            </div>

            <div className="ranking-glass rounded-xl p-3 sm:p-4 flex flex-wrap items-center gap-3 border border-border/50">
              <Trophy className="size-4 text-primary shrink-0" />
              <TabsList className="bg-transparent h-auto p-0 gap-1 flex-wrap">
                <TabsTrigger
                  value="ind"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold"
                >
                  Individual
                </TabsTrigger>
                <TabsTrigger
                  value="dupla"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold"
                >
                  Duplas
                </TabsTrigger>
                <TabsTrigger
                  value="quarteto"
                  className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 text-sm font-semibold"
                >
                  Quartetos
                </TabsTrigger>
              </TabsList>
            </div>
          </section>

          <div className="space-y-6">
            <div className="min-w-0">
              <TabsContent value="ind" className="mt-0">
                <RankingTable
                  rows={individualQ.data ?? []}
                  isLoading={isLoading}
                  emptyMessage={emptyMessage}
                />
              </TabsContent>
              <TabsContent value="dupla" className="mt-0">
                <RankingTable
                  rows={teamQ.data ?? []}
                  isLoading={isLoading}
                  emptyMessage={emptyMessage}
                />
              </TabsContent>
              <TabsContent value="quarteto" className="mt-0">
                <RankingTable
                  rows={teamQ.data ?? []}
                  isLoading={isLoading}
                  emptyMessage={emptyMessage}
                />
              </TabsContent>
            </div>

            <section className="min-w-0">
              <RankingSidebar analytics={analytics} />
            </section>
          </div>

        </div>
      </Tabs>
    </AppLayout>
  );
}
