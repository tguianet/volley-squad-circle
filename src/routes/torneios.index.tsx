import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { TournamentsEmptyState } from "@/components/tournaments/tournaments-empty-state";
import { TournamentsFab } from "@/components/tournaments/tournaments-fab";
import { TournamentsHeader } from "@/components/tournaments/tournaments-header";
import { TournamentsSidebar } from "@/components/tournaments/tournaments-sidebar";
import { TournamentsToolbar } from "@/components/tournaments/tournaments-toolbar";
import {
  fetchTournamentStats,
  fetchTournaments,
  registerForTournament,
} from "@/lib/tournament.queries";
import type { TournamentTab } from "@/lib/tournament.types";
import { useCurrentUser, useIsStaff } from "@/hooks/use-auth";
import { getErrorMessage } from "@/lib/utils";
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
    /tournaments|schema cache|relation|does not exist/i.test(tournamentsQ.error?.message ?? "");

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

  function handleRegister(tournamentId: string) {
    if (!user) {
      toast.error("Faça login para se inscrever.");
      return;
    }
    registerM.mutate(tournamentId);
  }

  return (
    <AppLayout>
      <div className="relative min-h-full tournament-page-bg">
        <div className="max-w-[1280px] mx-auto px-4 lg:px-10 py-6 lg:py-8">
          <TournamentsHeader activeCount={stats.active} registrationCount={stats.registrations} />

          <TournamentsToolbar
            tab={tab}
            onTabChange={setTab}
            search={search}
            onSearchChange={setSearch}
          />

          <div className="flex flex-col xl:flex-row gap-6">
            <div className="flex-1 min-w-0">
              {tournamentsQ.isLoading ? (
                <p className="text-sm text-muted-foreground py-16 text-center">
                  Carregando torneios…
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dbUnavailable ? (
                    <TournamentsEmptyState
                      title="Torneios em configuração"
                      description="A estrutura de torneios será aplicada no Lovable Cloud. O layout já está pronto para receber as competições."
                    />
                  ) : filtered.length === 0 ? (
                    <TournamentsEmptyState
                      title={
                        search.trim() ? "Nenhum torneio encontrado" : "Nenhum torneio publicado"
                      }
                      description={
                        search.trim()
                          ? "Tente outro termo de busca ou mude a aba Times Prontos / Sorteio de Times."
                          : "Quando a organização publicar torneios internos, eles aparecem aqui com inscrição online."
                      }
                    />
                  ) : (
                    filtered.map((t) => (
                      <TournamentCard
                        key={t.id}
                        tournament={t}
                        registering={registeringId === t.id}
                        onRegister={handleRegister}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            <TournamentsSidebar userId={user?.id} />
          </div>
        </div>

        {isStaff ? <TournamentsFab /> : null}
      </div>
    </AppLayout>
  );
}
