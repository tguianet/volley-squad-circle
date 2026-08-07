import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, MapPin, Trophy, Users } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-auth";
import {
  cancelTournamentRegistration,
  fetchTournamentById,
  registerForTournament,
} from "@/lib/tournament.queries";
import {
  canRegisterTournament,
  enrollmentProgress,
  formatTournamentDateTime,
  formatTournamentFee,
  getTournamentBadge,
} from "@/lib/tournament.types";
import { getErrorMessage } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/torneios/$id")({
  head: () => ({ meta: [{ title: "Torneio — PlayBeach" }] }),
  component: TournamentDetail,
});

function TournamentDetail() {
  const { id } = Route.useParams();
  const { user } = useCurrentUser();
  const queryClient = useQueryClient();
  const tournamentQ = useQuery({
    queryKey: ["tournament", id, user?.id],
    queryFn: () => fetchTournamentById(id, user?.id),
    retry: false,
  });

  const registrationM = useMutation({
    mutationFn: async (action: "register" | "cancel") => {
      if (!user) throw new Error("Faça login para gerenciar sua inscrição.");
      if (action === "register") await registerForTournament(id);
      else await cancelTournamentRegistration(id);
    },
    onSuccess: (_, action) => {
      toast.success(action === "register" ? "Inscrição confirmada!" : "Inscrição cancelada.");
      queryClient.invalidateQueries({ queryKey: ["tournament", id] });
      queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      queryClient.invalidateQueries({ queryKey: ["tournament-stats"] });
      queryClient.invalidateQueries({ queryKey: ["my-tournaments"] });
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, "Não foi possível atualizar sua inscrição."));
    },
  });

  if (tournamentQ.isLoading) {
    return (
      <AppLayout>
        <p className="py-20 text-center text-sm text-muted-foreground">Carregando torneio…</p>
      </AppLayout>
    );
  }

  const tournament = tournamentQ.data;
  if (!tournament || tournamentQ.isError) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-6">
          <Link
            to="/torneios"
            className="flex items-center gap-1 text-sm text-muted-foreground mb-3"
          >
            <ArrowLeft className="size-4" /> Torneios
          </Link>
          <Card className="p-10 text-center shadow-card">
            <div className="font-display text-xl mb-1">Torneio indisponível</div>
            <p className="text-sm text-muted-foreground">
              Esse torneio não está cadastrado ou não está mais disponível.
            </p>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const badge = getTournamentBadge(
    tournament.status,
    tournament.enrolled_count,
    tournament.max_teams,
    tournament.is_featured,
  );
  const canRegister = canRegisterTournament(
    tournament.status,
    tournament.enrolled_count,
    tournament.max_teams,
    tournament.user_registered,
  );

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <Link
          to="/torneios"
          className="flex items-center gap-1 text-sm text-muted-foreground mb-3 hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Torneios
        </Link>
        <Card className="overflow-hidden shadow-card">
          {tournament.image_url ? (
            <img src={tournament.image_url} alt="" className="h-56 w-full object-cover" />
          ) : null}
          <div className="p-6 space-y-5">
            <div>
              <span className={`coastal-pill ${badge.className}`}>{badge.label}</span>
              <h1 className="font-display text-3xl mt-3 text-primary">{tournament.title}</h1>
              <p className="text-muted-foreground mt-1">{tournament.category_label}</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" />{" "}
                {formatTournamentDateTime(tournament.event_date, tournament.start_time)}
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />{" "}
                {tournament.arena
                  ? `${tournament.arena.name}${tournament.arena.city ? ` — ${tournament.arena.city}` : ""}`
                  : "Arena não informada"}
              </div>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-primary" /> {tournament.enrolled_count} de{" "}
                {tournament.max_teams} inscritos
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" />{" "}
                {formatTournamentFee(tournament.entry_fee_cents)}
              </div>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${enrollmentProgress(tournament.enrolled_count, tournament.max_teams)}%`,
                }}
              />
            </div>

            {tournament.user_registered ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={registrationM.isPending}
                onClick={() => registrationM.mutate("cancel")}
              >
                {registrationM.isPending ? "Cancelando…" : "Cancelar minha inscrição"}
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={!canRegister || registrationM.isPending}
                onClick={() => registrationM.mutate("register")}
              >
                {registrationM.isPending
                  ? "Inscrevendo…"
                  : canRegister
                    ? "Quero me inscrever"
                    : "Inscrições indisponíveis"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
