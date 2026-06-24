import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CalendarDays, Clock, MapPin, Volleyball } from "lucide-react";
import { formatMatchDateLabel } from "@/lib/court-schedule";
import { formatTimeSlotLabel } from "@/lib/date-format";

export type OpenMatchCardData = {
  id: string;
  title: string;
  modality: string;
  match_type: string;
  date: string;
  start_time: string;
  end_time: string | null;
  max_players: number;
  status: string;
  court_number?: number | null;
  arena: { name: string; city: string | null } | null;
  players: Array<{
    player_id: string;
    status: string;
    profile?: { display_name: string | null; avatar_url: string | null } | null;
  }> | null;
};

const MOD_LABEL: Record<string, string> = {
  beach_volley: "Vôlei de Praia",
  indoor_volley: "Vôlei indoor",
  futevolei: "Futevôlei",
};

const TYPE_LABEL: Record<string, string> = {
  dupla: "Dupla",
  quarteto: "Quarteto",
  sexteto: "Sexteto",
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().slice(0, 2).toUpperCase();
}

type Props = {
  match: OpenMatchCardData;
  isIn: boolean;
  isFull: boolean;
  urgent?: boolean;
  onJoin: () => void;
  onLeave: () => void;
};

export function OpenMatchCard({ match, isIn, isFull, urgent, onJoin, onLeave }: Props) {
  const confirmed = (match.players ?? []).filter((p) => p.status === "confirmed");
  const extra = Math.max(0, confirmed.length - 2);
  const courtLabel = match.court_number
    ? `Quadra ${match.court_number}`
    : match.arena?.name ?? "Arena";

  return (
    <article
      className={cn(
        "match-card bg-card rounded-2xl p-5 sm:p-6 border border-border/60 transition-all duration-300 relative overflow-hidden hover:-translate-y-1 hover:shadow-lg",
      )}
    >
      {urgent ? (
        <div className="absolute top-4 right-4">
          <span className="coastal-pill bg-accent text-accent-foreground border-0 shadow-sm">
            Urgente
          </span>
        </div>
      ) : null}

      <div className="absolute top-4 left-4">
        <span className="coastal-pill bg-primary/10 text-primary border border-primary/20 text-[10px]">
          Amistoso
        </span>
      </div>

      <div className="flex items-start gap-4 mb-5 mt-6">
        <div className="size-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <Volleyball className="size-8" />
        </div>
        <div className="min-w-0 pr-16">
          <h3 className="font-display text-xl font-bold truncate">{match.title}</h3>
          <p className="text-sm text-muted-foreground">
            {MOD_LABEL[match.modality] ?? match.modality} · {TYPE_LABEL[match.match_type] ?? match.match_type}
          </p>
        </div>
      </div>

      <div className="space-y-3 mb-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-3">
          <CalendarDays className="size-4 text-primary shrink-0" />
          <span>{formatMatchDateLabel(match.date)}</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="size-4 text-primary shrink-0" />
          <span>
            {match.end_time
              ? formatTimeSlotLabel(match.start_time, match.end_time)
              : match.start_time.slice(0, 5)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <MapPin className="size-4 text-primary shrink-0" />
          <span>
            {courtLabel}
            {match.arena?.name ? ` · ${match.arena.name}` : ""}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-border/50 gap-3 flex-wrap">
        <div className="flex -space-x-3">
          {confirmed.slice(0, 2).map((p) => (
            <Avatar key={p.player_id} className="size-10 border-2 border-card">
              <AvatarImage src={p.profile?.avatar_url ?? undefined} />
              <AvatarFallback className="text-xs">{initials(p.profile?.display_name)}</AvatarFallback>
            </Avatar>
          ))}
          {extra > 0 ? (
            <div className="size-10 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs font-bold text-muted-foreground">
              +{extra}
            </div>
          ) : confirmed.length === 0 ? (
            <div className="size-10 rounded-full bg-muted border-2 border-card flex items-center justify-center text-xs text-muted-foreground">
              0
            </div>
          ) : null}
        </div>

        {isIn ? (
          <Button variant="outline" className="rounded-xl font-bold" onClick={onLeave}>
            Cancelar inscrição
          </Button>
        ) : (
          <Button
            variant="beach"
            className="rounded-xl font-bold shadow-md"
            disabled={isFull}
            onClick={onJoin}
          >
            {isFull ? "Lotada" : "Entrar na Partida"}
          </Button>
        )}
      </div>
    </article>
  );
}
