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
  const comingSoon = tournament.status === "coming_soon";

  return (
    <article className="glass-card rounded-[24px] overflow-hidden group hover:-translate-y-1 transition-all duration-300">
      <div className="h-48 relative overflow-hidden">
        <img
          src={tournament.image_url ?? DEFAULT_IMAGE}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <span
          className={cn(
            "absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg",
            badge.className,
          )}
        >
          {badge.label}
        </span>
        <div className="absolute bottom-0 inset-x-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
        <p className="absolute bottom-4 left-4 text-white text-sm font-bold flex items-center gap-2">
          <MapPin className="size-4 shrink-0" />
          {tournament.arena?.name ?? "Arena PlayBeach"}
        </p>
      </div>

      <div className="p-6">
        <span className="text-xs font-bold uppercase tracking-wider text-primary mb-1 block">
          {tournament.category_label}
        </span>
        <h3 className="font-display text-2xl tracking-wide leading-tight text-foreground mb-4">
          {tournament.title}
        </h3>

        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Calendar className="size-[18px] text-primary shrink-0" />
            {formatTournamentDateTime(tournament.event_date, tournament.start_time)}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Volleyball className="size-[18px] text-primary shrink-0" />
            {formatTournamentFee(tournament.entry_fee_cents)}
          </span>
        </div>

        <div className={cn("mb-6", comingSoon && "opacity-60")}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
              Vagas preenchidas
            </span>
            <span className={cn("text-xs font-bold", almostFull ? "text-accent" : "text-primary")}>
              {tournament.enrolled_count}/{tournament.max_teams}
            </span>
          </div>
          <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                almostFull
                  ? "bg-accent shadow-[0_0_8px_rgba(253,129,0,0.4)]"
                  : "bg-primary shadow-[0_0_8px_rgba(0,105,112,0.4)]",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {canRegister ? (
          <Button
            className="w-full h-auto py-4 rounded-xl font-bold shadow-md gap-2 text-base"
            disabled={registering}
            onClick={() => onRegister(tournament.id)}
          >
            Inscrever-se
            <ArrowRight className="size-[18px]" />
          </Button>
        ) : tournament.user_registered ? (
          <Button variant="secondary" className="w-full h-auto py-4 rounded-xl font-bold" disabled>
            Inscrição confirmada
          </Button>
        ) : (
          <Button
            variant="secondary"
            className="w-full h-auto py-4 rounded-xl font-bold text-muted-foreground cursor-not-allowed"
            disabled
          >
            Aguardando abertura
          </Button>
        )}
      </div>
    </article>
  );
}
