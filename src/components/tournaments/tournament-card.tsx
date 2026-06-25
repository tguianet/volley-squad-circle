import { ArrowRight, Calendar, MapPin, Volleyball } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TournamentListItem } from "@/lib/tournament.types";
import {
  canRegisterTournament,
  enrollmentProgress,
  formatTournamentDateTime,
  formatTournamentFee,
  getTournamentBadge,
} from "@/lib/tournament.types";

const DEFAULT_IMAGE =
  "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&q=80&auto=format&fit=crop";

type TournamentCardProps = {
  tournament: TournamentListItem;
  onRegister: (id: string) => void;
  registering?: boolean;
};

export function TournamentCard({ tournament, onRegister, registering }: TournamentCardProps) {
  const badge = getTournamentBadge(
    tournament.status,
    tournament.enrolled_count,
    tournament.max_teams,
    tournament.is_featured,
  );
  const progress = enrollmentProgress(tournament.enrolled_count, tournament.max_teams);
  const canRegister = canRegisterTournament(
    tournament.status,
    tournament.enrolled_count,
    tournament.max_teams,
    tournament.user_registered,
  );
  const almostFull = progress >= 85;

  return (
    <article className="tournament-glass rounded-3xl overflow-hidden group hover:-translate-y-1 transition-all duration-300">
      <div className="h-48 relative overflow-hidden">
        <img
          src={tournament.image_url ?? DEFAULT_IMAGE}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <span
          className={cn(
            "absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide shadow-lg",
            badge.className,
          )}
        >
          {badge.label}
        </span>
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        <p className="absolute bottom-4 left-4 text-white text-sm font-semibold flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" />
          {tournament.arena?.name ?? "Arena PlayBeach"}
        </p>
      </div>

      <div className="p-5 sm:p-6">
        <span className="text-[10px] font-bold uppercase tracking-wider text-primary mb-1 block">
          {tournament.category_label}
        </span>
        <h3 className="font-display text-xl tracking-wide leading-tight mb-4">{tournament.title}</h3>

        <div className="flex flex-wrap items-center gap-4 mb-5 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4 text-primary shrink-0" />
            {formatTournamentDateTime(tournament.event_date, tournament.start_time)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Volleyball className="size-4 text-primary shrink-0" />
            {formatTournamentFee(tournament.entry_fee_cents)}
          </span>
        </div>

        <div className={cn("mb-5", tournament.status === "coming_soon" && "opacity-60")}>
          <div className="flex justify-between items-center mb-2 text-xs">
            <span className="font-bold text-muted-foreground uppercase tracking-wide">
              Vagas preenchidas
            </span>
            <span
              className={cn("font-bold", almostFull ? "text-accent" : "text-primary")}
            >
              {tournament.enrolled_count}/{tournament.max_teams}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                almostFull ? "bg-accent" : "bg-primary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {canRegister ? (
          <Button
            className="w-full h-11 rounded-xl font-bold shadow-md gap-2"
            disabled={registering}
            onClick={() => onRegister(tournament.id)}
          >
            Inscrever-se
            <ArrowRight className="size-4" />
          </Button>
        ) : tournament.user_registered ? (
          <Button variant="secondary" className="w-full h-11 rounded-xl font-bold" disabled>
            Inscrição confirmada
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full h-11 rounded-xl font-bold text-muted-foreground"
            disabled
          >
            Aguardando abertura
          </Button>
        )}
      </div>
    </article>
  );
}
