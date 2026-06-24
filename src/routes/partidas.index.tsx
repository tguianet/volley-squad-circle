import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Search, Info, Volleyball } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { useCurrentUser } from "@/hooks/use-auth";
import { OpenMatchCard, type OpenMatchCardData } from "@/components/matches/open-match-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/partidas/")({
  head: () => ({ meta: [{ title: "Partidas Amistosas | PLAYBEACH" }] }),
  component: MatchesPage,
});

type MatchPlayerStatus = Database["public"]["Enums"]["match_player_status"];
type TypeFilter = "all" | "dupla" | "quarteto" | "sexteto";

function MatchesPage() {
  const { user } = useCurrentUser();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const { data: matches = [], isLoading } = useQuery<OpenMatchCardData[]>({
    queryKey: ["open-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select(
          `
          id, title, modality, match_type, date, start_time, end_time, max_players, status, court_number,
          arena:arena_id(name, city),
          players:match_players(player_id, status)
        `,
        )
        .in("status", ["open", "full"])
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .order("start_time");
      if (error) throw error;
      return (data ?? []) as OpenMatchCardData[];
    },
  });

  const filtered = useMemo(() => {
    return matches.filter((m) => {
      if (typeFilter !== "all" && m.match_type !== typeFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        m.title.toLowerCase().includes(q) ||
        (m.arena?.name?.toLowerCase().includes(q) ?? false) ||
        String(m.court_number ?? "").includes(q)
      );
    });
  }, [matches, typeFilter, search]);

  const todayIso = new Date().toISOString().slice(0, 10);

  async function join(matchId: string) {
    if (!user) {
      toast.error("Faça login.");
      return;
    }
    const { error } = await supabase.from("match_players").insert({
      match_id: matchId,
      player_id: user.id,
      status: "confirmed" satisfies MatchPlayerStatus,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Você entrou na partida amistosa!");
    qc.invalidateQueries({ queryKey: ["open-matches"] });
    qc.invalidateQueries({ queryKey: ["my-matches"] });
  }

  async function leave(matchId: string) {
    if (!user) return;
    const { error } = await supabase
      .from("match_players")
      .delete()
      .eq("match_id", matchId)
      .eq("player_id", user.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Inscrição cancelada.");
    qc.invalidateQueries({ queryKey: ["open-matches"] });
    qc.invalidateQueries({ queryKey: ["my-matches"] });
  }

  return (
    <AppLayout>
      <div className="relative min-h-full">
        <div className="fixed inset-0 pointer-events-none -z-10 opacity-30">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1440px] mx-auto px-4 lg:px-10 py-6 lg:py-8">
          {/* Header */}
          <header className="sticky top-0 z-20 -mx-4 lg:-mx-10 px-4 lg:px-10 py-4 mb-6 challenge-glass border-b border-border/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="page-title text-2xl sm:text-3xl text-foreground">VÔLEI DE PRAIA</h1>
              <span className="coastal-pill bg-muted text-muted-foreground border border-border">
                {filtered.length}{" "}
                {filtered.length === 1 ? "partida aberta" : "partidas abertas"}
              </span>
              <span className="coastal-pill bg-primary/10 text-primary border border-primary/20">
                Amistoso
              </span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por quadra ou título..."
                  className="w-full sm:w-64 h-10 pl-9 pr-4 rounded-xl border border-border bg-card text-sm focus:ring-2 focus:ring-primary/30 outline-none"
                />
              </div>
              <Button asChild variant="beach" className="rounded-xl font-bold shadow-md">
                <Link to="/partidas/nova">
                  <Plus className="size-4 mr-1" />
                  Nova Partida
                </Link>
              </Button>
            </div>
          </header>

          {/* Filtros */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 no-scrollbar">
            {(
              [
                { id: "all", label: "Todas" },
                { id: "dupla", label: "Dupla" },
                { id: "quarteto", label: "Quarteto" },
                { id: "sexteto", label: "Sexteto" },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setTypeFilter(f.id)}
                className={cn(
                  "coastal-pill border-2 whitespace-nowrap transition-colors",
                  typeFilter === f.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border text-muted-foreground hover:border-primary/40",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Aviso */}
          <div className="mb-8 p-4 bg-accent/5 border-l-4 border-accent rounded-r-xl flex items-start gap-3">
            <Info className="size-5 text-accent shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              <span className="font-bold text-accent">Aviso:</span> Partidas de{" "}
              <span className="font-semibold text-foreground">ranking (desafios)</span> usam a mesma
              agenda de domingos e têm prioridade nas quadras centrais. Estas partidas são{" "}
              <span className="font-semibold text-primary">amistosas</span> — não alteram posição no
              ranking.
            </p>
          </div>

          {isLoading ? (
            <Card className="p-10 text-center text-muted-foreground">Carregando partidas…</Card>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center challenge-panel">
              <div className="size-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Volleyball className="size-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">Nenhuma partida amistosa aberta</h2>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Crie a primeira partida e convoque a galera. Use a mesma agenda de domingos do ranking.
              </p>
              <Button asChild variant="beach">
                <Link to="/partidas/nova">Criar partida amistosa</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
              {filtered.map((m) => {
                const confirmed = (m.players ?? []).filter((p) => p.status === "confirmed").length;
                const isIn = (m.players ?? []).some((p) => p.player_id === user?.id);
                const isFull = m.status === "full" || confirmed >= m.max_players;
                const urgent =
                  m.date === todayIso && !isFull && confirmed >= m.max_players - 1;
                return (
                  <OpenMatchCard
                    key={m.id}
                    match={m}
                    isIn={isIn}
                    isFull={isFull}
                    urgent={urgent}
                    onJoin={() => join(m.id)}
                    onLeave={() => leave(m.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
