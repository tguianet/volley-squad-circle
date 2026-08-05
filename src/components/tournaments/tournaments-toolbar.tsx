import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { TournamentTab } from "@/lib/tournament.types";
import { cn } from "@/lib/utils";

type TournamentsToolbarProps = {
  tab: TournamentTab;
  onTabChange: (tab: TournamentTab) => void;
  search: string;
  onSearchChange: (value: string) => void;
};

export function TournamentsToolbar({
  tab,
  onTabChange,
  search,
  onSearchChange,
}: TournamentsToolbarProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8 border-b border-border/40 pb-4">
      <div className="flex gap-8 w-full md:w-auto">
        <button
          type="button"
          onClick={() => onTabChange("ready_teams")}
          className={cn(
            "relative py-2 px-1 text-sm font-bold transition-colors whitespace-nowrap",
            tab === "ready_teams"
              ? "text-primary"
              : "text-muted-foreground/60 hover:text-foreground",
          )}
        >
          Times Prontos
          {tab === "ready_teams" ? <span className="active-tab-indicator" /> : null}
        </button>
        <button
          type="button"
          onClick={() => onTabChange("team_draw")}
          className={cn(
            "relative py-2 px-1 text-sm font-bold transition-colors whitespace-nowrap",
            tab === "team_draw" ? "text-primary" : "text-muted-foreground/60 hover:text-foreground",
          )}
        >
          Sorteio de Times
          {tab === "team_draw" ? <span className="active-tab-indicator" /> : null}
        </button>
      </div>
      <div className="relative w-full md:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-[18px] text-muted-foreground/50" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por torneio ou categoria..."
          className="pl-12 h-12 rounded-xl bg-card border-border/50 placeholder:text-muted-foreground/50 focus-visible:ring-primary/20"
        />
      </div>
    </div>
  );
}
