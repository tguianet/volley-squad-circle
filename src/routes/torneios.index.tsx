import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Input } from "@/components/ui/input";
import { Medal, Plus, Search, Trophy, UserPlus } from "lucide-react";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { TournamentsSidebar } from "@/components/tournaments/tournaments-sidebar";
import {
  fetchTournamentStats,
  fetchTournaments,
  registerForTournament,
} from "@/lib/tournament.queries";
import type { TournamentTab } from "@/lib/tournament.types";
import { useCurrentUser, useIsStaff } from "@/hooks/use-auth";
import { cn, getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/torneios/")({
  head: () => ({ meta: [{ title: "Torneios Internos | PLAYBEACH" }] }),
  component: TournamentsPage,
});

function TournamentsPage() {
  const { user } = useCurrentUser();
  const isStaff = useIsStaff();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TournamentTab>("ready_teams");
  const [search, setSearch] = useState("");
  const [registeringId, setRegisteringId] = useState<string | null>(null);

  const tournamentsQ = useQuery({
    queryKey: ["tournaments", user?.id],
    queryFn: () => fetchTournaments(user?.id),
    retry: false,
  });

  const statsQ = useQuery({
    queryKey: ["tournament-stats"],
    queryFn: fetchTournamentStats,
    retry: false,
  });

  const dbUnavailable =
    tournamentsQ.isError &&
    /tournaments|schema cache|relation|does not exist/i.test(
      tournamentsQ.error?.message ?? "",
    );

  const registerM = useMutation({
    mutationFn: async (tournamentId: string) => {
      if (!user) throw new Error("Faça login para se inscrever.");
      setRegisteringId(tournamentId);
      await registerForTournament(tournamentId, user.id);
    },
    onSuccess: () => {
      toast.success("Inscrição confirmada!");
      qc.invalidateQueries({ queryKey: ["tournaments"] });
      qc.invalidateQueries({ queryKey: ["tournament-stats"] });
      qc.invalidateQueries({ queryKey: ["my-tournaments"] });
    },
    onError: (e: unknown) => {
      toast.error(getErrorMessage(e, "Não foi possível inscrever-se."));
    },
    onSettled: () => setRegisteringId(null),
  });

  const filtered = useMemo(() => {
    const list = tournamentsQ.data ?? [];
    return list.filter((t) => {
      if (t.format !== tab) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.category_label.toLowerCase().includes(q) ||
        (t.arena?.name?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [tournamentsQ.data, tab, search]);

  const stats = statsQ.data ?? { active: 0, registrations: 0 };

  return (
    <AppLayout>
      <div className="relative min-h-full">
        <div className="fixed inset-0 pointer-events-none -z-10 opacity-40">
          <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px]" />
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-[1280px] mx-auto px-4 lg:px-8 py-6 lg:py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 lg:mb-10">
            <div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-wide text-primary leading-tight">
                TORNEIOS INTERNOS
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl text-sm sm:text-base">
                Participe das competições oficiais da Arena PlayBeach. Mostre sua habilidade nas
                areias!
              </p>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <div className="rounded-2xl border border-border/50 bg-card px-5 py-3.5 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="size-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Medal className="size-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Torneios ativos
                  </p>
                  <p className="font-display text-2xl leading-none">
                    {String(stats.active).padStart(2, "0")}
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card px-5 py-3.5 shadow-sm flex items-center gap-3 min-w-[140px]">
                <div className="size-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <UserPlus className="size-5 text-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                    Inscrições
                  </p>
                  <p className="font-display text-2xl leading-none">
                    {String(stats.registrations).padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 mb-8 border-b border-border/40 pb-4">
            <div className="flex gap-6 sm:gap-8">
              <button
                type="button"
                onClick={() => setTab("ready_teams")}
                className={cn(
                  "relative py-2 text-sm font-bold transition-colors",
                  tab === "ready_teams"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Times prontos
                {tab === "ready_teams" ? (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-[3px] bg-primary rounded-full" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setTab("team_draw")}
                className={cn(
                  "relative py-2 text-sm font-bold transition-colors",
                  tab === "team_draw"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Sorteio de times
                {tab === "team_draw" ? (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-[3px] bg-primary rounded-full" />
                ) : null}
              </button>
            </div>
            <div className="relative w-full md:max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por torneio ou categoria…"
                className="pl-10 h-11 rounded-xl bg-card"
              />
            </div>
          </div>

          <div className="flex flex-col xl:flex-row gap-6 lg:gap-8">
            <div className="flex-1 min-w-0">
              {tournamentsQ.isLoading ? (
                <p className="text-sm text-muted-foreground py-12 text-center">
                  Carregando torneios…
                </p>
              ) : dbUnavailable ? (
                <div className="rounded-3xl border border-border/50 bg-card p-10 text-center tournament-glass">
                  <div className="size-14 mx-auto rounded-2xl gradient-beach flex items-center justify-center mb-4">
                    <Trophy className="size-7 text-white" />
                  </div>
                  <p className="font-display text-xl mb-1">Torneios em configuração</p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    A estrutura de torneios ainda será aplicada no Lovable Cloud. Enquanto isso,
                    esta página já está disponível no menu.
                  </p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="rounded-3xl border border-border/50 bg-card p-10 text-center tournament-glass">
                  <div className="size-14 mx-auto rounded-2xl gradient-beach flex items-center justify-center mb-4">
                    <Trophy className="size-7 text-white" />
                  </div>
                  <p className="font-display text-xl mb-1">
                    {search.trim() ? "Nenhum torneio encontrado" : "Nenhum torneio publicado ainda"}
                  </p>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    {search.trim()
                      ? "Tente outro termo de busca ou mude a aba."
                      : "Quando a organização publicar torneios internos, eles aparecem aqui com inscrição online."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
                  {filtered.map((t) => (
                    <TournamentCard
                      key={t.id}
                      tournament={t}
                      registering={registeringId === t.id}
                      onRegister={(id) => {
                        if (!user) {
                          toast.error("Faça login para se inscrever.");
                          return;
                        }
                        registerM.mutate(id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <TournamentsSidebar userId={user?.id} />
          </div>
        </div>

        {isStaff ? (
          <button
            type="button"
            onClick={() => toast.info("Criação de torneios pelo admin em breve.")}
            className="fixed bottom-8 right-8 size-14 bg-accent text-accent-foreground rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 group"
            aria-label="Criar torneio"
          >
            <Plus className="size-7" />
            <span className="absolute right-16 bg-foreground text-background px-3 py-1.5 rounded-lg text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none hidden sm:block">
              Criar torneio
            </span>
          </button>
        ) : null}
      </div>
    </AppLayout>
  );
}
