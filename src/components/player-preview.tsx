import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ruler, Hand, Target, Trophy } from "lucide-react";

export type PreviewProfile = {
  id: string;
  name: string;
  username?: string | null;
  avatar?: string | null;
  city?: string | null;
  level?: string | null;
  height?: number | null;
  dominantHand?: string | null;
  position?: string | null;
  wins?: number | null;
  losses?: number | null;
  rankingPoints?: number | null;
};

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

export function PlayerPreview({
  player,
  children,
}: {
  player: PreviewProfile;
  children: React.ReactNode;
}) {
  const wins = player.wins ?? 0;
  const losses = player.losses ?? 0;
  const matches = wins + losses;
  const winRate = matches ? ((wins / matches) * 100).toFixed(0) : "0";
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-72 p-0 overflow-hidden">
        <div className="relative h-20 bg-gradient-to-r from-primary/20 to-accent/20">
          <div className="absolute -bottom-6 left-4">
            <Avatar className="size-12 ring-4 ring-popover shadow-md">
              <AvatarImage src={player.avatar ?? undefined} />
              <AvatarFallback>{player.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="pt-8 px-4 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{player.name}</div>
              {player.username && (
                <div className="text-xs text-muted-foreground truncate">@{player.username}</div>
              )}
            </div>
            {player.level && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                {player.level}
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-2 gap-y-1 gap-x-2">
            {player.city && <Info icon={MapPin} label="Cidade" value={player.city} />}
            {player.height != null && (
              <Info icon={Ruler} label="Altura" value={`${player.height} m`} />
            )}
            {player.dominantHand && <Info icon={Hand} label="Mão" value={player.dominantHand} />}
            {player.position && <Info icon={Target} label="Posição" value={player.position} />}
          </div>

          <div className="grid grid-cols-3 gap-2 text-center border-t pt-2">
            <div>
              <div className="font-display text-base text-success">{wins}</div>
              <div className="text-[10px] text-muted-foreground">Vitórias</div>
            </div>
            <div>
              <div className="font-display text-base text-destructive">{losses}</div>
              <div className="text-[10px] text-muted-foreground">Derrotas</div>
            </div>
            <div>
              <div className="font-display text-base text-primary">{winRate}%</div>
              <div className="text-[10px] text-muted-foreground">Aproveit.</div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Trophy className="size-3" />
              Ranking
            </div>
            <div className="font-display text-lg text-gradient">{player.rankingPoints ?? 0}</div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
