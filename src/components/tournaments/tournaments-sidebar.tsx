import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Medal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchIndividualRankingRows } from "@/lib/ranking.queries";
import { fetchMyTournaments, type MyTournamentEntry } from "@/lib/tournament.queries";
import { formatTournamentDateTime } from "@/lib/tournament.types";
import { cn } from "@/lib/utils";

function MyTournamentItem({ entry, variant }: { entry: MyTournamentEntry; variant: "upcoming" | "past" }) {
  const today = new Date().toISOString().slice(0, 10);
  const isPast = entry.event_date < today || entry.status === "finished";

  if (variant === "past" && !isPast) return null;
  if (variant === "upcoming" && isPast) return null;

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-secondary/40 border border-border/40",
        variant === "past" && "opacity-70",
      )}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
          {variant === "upcoming" ? "Próximo jogo" : "Concluído"}
        </span>
        {variant === "upcoming" ? (
          <span className="bg-accent/15 text-accent px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
            {formatTournamentDateTime(entry.event_date, entry.start_time)}
          </span>
        ) : (
          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold shrink-0">
            Inscrito
          </span>
        )}
      </div>
      <p className="font-semibold text-sm mb-1">{entry.title}</p>
      <p className="text-xs text-muted-foreground">
        {entry.arena_name ?? "Arena PlayBeach"}
      </p>
    </div>
  );
}

type TournamentsSidebarProps = {
  userId?: string;
};

export function TournamentsSidebar({ userId }: TournamentsSidebarProps) {
  const rankingQ = useQuery({
    queryKey: ["tournament-sidebar-ranking"],
    queryFn: () => fetchIndividualRankingRows("M"),
  });

  const myQ = useQuery({
    queryKey: ["my-tournaments", userId],
    queryFn: () => fetchMyTournaments(userId!),
    enabled: !!userId,
  });

  const topPlayers = (rankingQ.data ?? []).slice(0, 3);
  const myTournaments = myQ.data ?? [];

  return (
    <aside className="w-full xl:w-80 space-y-6 shrink-0">
      <section className="rounded-3xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg tracking-wide">Meus torneios</h2>
          <Link to="/torneios" className="text-primary text-xs font-bold hover:underline">
            Ver tudo
          </Link>
        </div>
        {!userId ? (
          <p className="text-xs text-muted-foreground">Faça login para ver suas inscrições.</p>
        ) : myQ.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : myTournaments.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Você ainda não está inscrito em nenhum torneio.
          </p>
        ) : (
          <div className="space-y-3">
            {myTournaments.map((entry) => (
              <MyTournamentItem key={entry.id} entry={entry} variant="upcoming" />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-border/50 bg-card p-5 sm:p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg tracking-wide">Ranking da arena</h2>
          <Medal className="size-5 text-primary" />
        </div>
        {rankingQ.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : topPlayers.length === 0 ? (
          <p className="text-xs text-muted-foreground">Ranking ainda vazio.</p>
        ) : (
          <div className="space-y-2">
            {topPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/40 transition-colors group cursor-default"
              >
                <div className="w-8 font-display text-xl text-primary/30 group-hover:text-primary transition-colors italic leading-none">
                  {String(player.position).padStart(2, "0")}
                </div>
                <div className="size-10 rounded-full bg-secondary overflow-hidden shrink-0 border border-border/50">
                  {player.players[0]?.avatar_url ? (
                    <img
                      src={player.players[0].avatar_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary/10" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">
                    {player.points} pts · {player.categoryLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link to="/ranking" className="block mt-5">
          <Button
            variant="outline"
            className="w-full h-9 rounded-xl text-xs font-bold border-primary/20 text-primary hover:bg-primary/5"
          >
            Ver ranking completo
          </Button>
        </Link>
      </section>
    </aside>
  );
}
