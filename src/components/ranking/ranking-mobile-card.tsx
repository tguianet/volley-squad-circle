import { ChevronDown, ChevronUp, Crown, MapPin, Medal } from "lucide-react";
import { RANKING_ARENA_UNDEFINED } from "@/lib/ranking.types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AvatarThumb } from "@/components/avatar-thumb";
import { cn } from "@/lib/utils";
import type { RankingTableRow } from "@/lib/ranking.types";
import { RankingDetailsPanel } from "@/components/ranking/ranking-details-row";
import type { RankingDetailsPayload } from "@/lib/ranking.types";

type RankingMobileCardProps = {
  row: RankingTableRow;
  displayPosition: number;
  expanded: boolean;
  onToggle: () => void;
  details: RankingDetailsPayload | undefined;
  detailsLoading: boolean;
};

export function RankingMobileCard({
  row,
  displayPosition,
  expanded,
  onToggle,
  details,
  detailsLoading,
}: RankingMobileCardProps) {
  return (
    <Card className="p-4 shadow-card border-border/80 space-y-3">
      <div className="flex items-start gap-3">
        <PositionBadge position={displayPosition} />
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <div className="font-semibold truncate">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.categoryLabel}</div>
          </div>
          <PlayerChips players={row.players} compact />
          <ArenaLabel label={row.arenaLabel} />
          <div className="flex items-center gap-4 text-xs">
            <span>
              <span className="text-muted-foreground">Jogos:</span>{" "}
              <strong>{row.games}</strong>
            </span>
            <span>
              <span className="text-muted-foreground">Pts:</span>{" "}
              <strong className="text-primary">{row.points}</strong>
            </span>
          </div>
        </div>
      </div>
      <Button variant="outline" size="sm" className="w-full" onClick={onToggle}>
        Mais detalhes
        {expanded ? (
          <ChevronUp className="size-4 ml-1" />
        ) : (
          <ChevronDown className="size-4 ml-1" />
        )}
      </Button>
      {expanded ? (
        <div className="rounded-xl bg-secondary/25 border border-border/60 overflow-hidden">
          <RankingDetailsPanel details={details} isLoading={detailsLoading} />
        </div>
      ) : null}
    </Card>
  );
}

export function PositionBadge({ position }: { position: number }) {
  return (
    <div
      className={cn(
        "size-9 rounded-full flex items-center justify-center font-display text-sm shrink-0",
        position === 1
          ? "gradient-beach text-white shadow-glow"
          : position === 2
            ? "bg-secondary text-foreground"
            : position === 3
              ? "bg-accent/30 text-accent-foreground"
              : "bg-muted text-muted-foreground",
      )}
    >
      {position === 1 ? <Crown className="size-4" /> : position}
    </div>
  );
}

export function PlayerChips({
  players,
  compact = false,
}: {
  players: RankingTableRow["players"];
  compact?: boolean;
}) {
  if (players.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {players.map((p) => (
        <div
          key={p.id}
          className={cn(
            "inline-flex items-center gap-1 rounded-full bg-secondary/70",
            compact ? "pl-0.5 pr-2 py-0.5" : "pl-1 pr-2.5 py-1",
          )}
        >
          <AvatarThumb src={p.avatar_url} name={p.name} className={compact ? "size-5" : "size-6"} />
          <span className={cn("truncate", compact ? "text-[11px] max-w-[88px]" : "text-xs max-w-[120px]")}>
            {p.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ArenaLabel({ label }: { label: string }) {
  const isUndefined = label === RANKING_ARENA_UNDEFINED;
  return (
    <div className="flex items-center gap-1 min-w-0">
      <MapPin className="size-3 shrink-0 text-primary/60" />
      <span
        className={cn(
          "text-xs truncate",
          isUndefined ? "text-muted-foreground italic" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}

export function PointsCell({ points }: { points: number }) {
  return (
    <div className="text-right">
      <div className="font-display text-lg text-gradient leading-none">{points}</div>
      <div className="text-[10px] text-muted-foreground flex items-center gap-0.5 justify-end mt-0.5">
        <Medal className="size-3" />
        pts
      </div>
    </div>
  );
}
