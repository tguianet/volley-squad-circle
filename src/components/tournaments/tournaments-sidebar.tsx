import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchIndividualRankingRows } from "@/lib/ranking.queries";
import { fetchMyTournaments, type MyTournamentEntry } from "@/lib/tournament.queries";
import { formatTournamentDateTime } from "@/lib/tournament.types";
import { cn } from "@/lib/utils";

function MyTournamentItem({
  entry,
  variant,
}: {
  entry: MyTournamentEntry;
  variant: "upcoming" | "past";
}) {
  const today = new Date().toISOString().slice(0, 10);
  const isPast = entry.event_date < today || entry.status === "finished";

  if (variant === "past" && !isPast) return null;
  if (variant === "upcoming" && isPast) return null;

  return (
    <div
      className={cn(
        "p-4 rounded-xl bg-secondary/60 border border-border/30",
        variant === "past" && "opacity-70",
      )}
    >
      <div className="flex justify-between items-start gap-2 mb-2">
        <span
          className={cn(
            "text-[10px] font-bold uppercase tracking-wide",
            variant === "upcoming" ? "text-primary" : "text-muted-foreground",
          )}
        >
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
      <p className="font-bold text-sm mb-1">{entry.title}</p>
      <p className="text-xs text-muted-foreground">{entry.arena_name ?? "Arena PlayBeach"}</p>
    </div>
  );
}

function EmptyMyTournaments({ loggedIn }: { loggedIn: boolean }) {
  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl border border-dashed border-border/50 bg-secondary/30 text-center">
        <p className="text-xs text-muted-foreground">
          {loggedIn
            ? "Você ainda não está inscrito em nenhum torneio."
            : "Faça login para ver suas inscrições."}
        </p>
      </div>
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
  const upcoming = myTournaments.filter((e) => {
    const today = new Date().toISOString().slice(0, 10);
    return e.event_date >= today && e.status !== "finished";
  });
  const past = myTournaments.filter((e) => {
    const today = new Date().toISOString().slice(0, 10);
    return e.event_date < today || e.status === "finished";
  });

  return (
    <aside className="w-full xl:w-80 space-y-6 shrink-0">
      <section className="rounded-[24px] border border-border/40 bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg text-foreground">Meus Torneios</h2>
          <Link to="/torneios" className="text-primary text-xs font-bold hover:underline">
            Ver tudo
          </Link>
        </div>
        {myQ.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : myTournaments.length === 0 ? (
          <EmptyMyTournaments loggedIn={!!userId} />
        ) : (
          <div className="space-y-4">
            {upcoming.slice(0, 1).map((entry) => (
              <MyTournamentItem key={entry.id} entry={entry} variant="upcoming" />
            ))}
            {past.slice(0, 1).map((entry) => (
              <MyTournamentItem key={`past-${entry.id}`} entry={entry} variant="past" />
            ))}
          </div>
        )}
      </section>

      <section className="rounded-[24px] border border-border/40 bg-card p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-lg text-foreground">Ranking da Arena</h2>
          <BarChart3 className="size-5 text-primary" />
        </div>
        {rankingQ.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : topPlayers.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-border/50 bg-secondary/30 text-center">
            <p className="text-xs text-muted-foreground">Ranking ainda vazio.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {topPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-4 group p-2 rounded-xl hover:bg-secondary/50 transition-all cursor-default"
              >
                <div className="w-8 font-display text-2xl text-primary/30 group-hover:text-primary transition-colors italic leading-none">
                  {String(player.position).padStart(2, "0")}
                </div>
                <div className="size-10 rounded-full bg-muted overflow-hidden shrink-0 border border-border/40">
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
                  <p className="font-bold text-sm truncate">{player.name}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-medium truncate">
                    {player.points.toLocaleString("pt-BR")} pts · {player.categoryLabel}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <Link to="/ranking" className="block mt-6">
          <Button
            variant="outline"
            className="w-full h-auto py-2 rounded-xl text-xs font-bold border-2 border-primary/20 text-primary hover:bg-primary/5"
          >
            Ver Ranking Completo
          </Button>
        </Link>
      </section>
    </aside>
  );
}
