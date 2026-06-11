import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Ruler, Hand, ArrowLeftRight, Trophy, Target } from "lucide-react";
import type { Player } from "@/lib/mock-data";

function Info({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <Icon className="size-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}

export function PlayerPreview({ player, children }: { player: Player; children: React.ReactNode }) {
  const winRate = player.matches ? ((player.wins / player.matches) * 100).toFixed(0) : "0";
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-72 p-0 overflow-hidden">
        <div className="relative h-20 bg-gradient-to-r from-primary/20 to-primary-glow/20">
          <div className="absolute -bottom-6 left-4">
            <Avatar className="size-12 ring-4 ring-popover shadow-md">
              <AvatarImage src={player.avatar} />
              <AvatarFallback>{player.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="pt-8 px-4 pb-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold truncate">{player.name}</div>
              <div className="text-xs text-muted-foreground truncate">{player.username}</div>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">{player.level}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-y-1 gap-x-2">
            <Info icon={MapPin} label="Cidade" value={player.city} />
            <Info icon={Ruler} label="Altura" value={`${player.height} cm`} />
            <Info icon={Hand} label="Mão" value={player.dominantHand} />
            <Info icon={ArrowLeftRight} label="Lado" value={player.preferredSide} />
            <Info icon={Target} label="Posição" value={(player as any).position ?? "—"} />
          </div>

          <div className="grid grid-cols-3 gap-2 text-center border-t pt-2">
            <div>
              <div className="font-display text-base text-success">{player.wins}</div>
              <div className="text-[10px] text-muted-foreground">Vitórias</div>
            </div>
            <div>
              <div className="font-display text-base text-destructive">{player.losses}</div>
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
              {player.mvps} MVPs
            </div>
            <div className="font-display text-lg text-gradient">{player.rankingPoints}</div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
