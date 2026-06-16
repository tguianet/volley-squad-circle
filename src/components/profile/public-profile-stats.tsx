import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Trophy, TrendingUp } from "lucide-react";
import { fetchProfileRankingPosition } from "@/lib/feed.queries";
import { Link } from "@tanstack/react-router";

type PublicProfileStatsProps = {
  profileId: string;
  pontos: number;
  vitorias: number;
  derrotas: number;
  compact?: boolean;
};

function StatBlock({
  label,
  value,
  accentClass,
}: {
  label: string;
  value: number | string;
  accentClass?: string;
}) {
  return (
    <div className="text-center p-3 rounded-xl bg-secondary/50">
      <div className={`font-display text-2xl sm:text-3xl leading-none ${accentClass ?? ""}`}>
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

export function PublicProfileStats({
  profileId,
  pontos,
  vitorias,
  derrotas,
  compact,
}: PublicProfileStatsProps) {
  const matches = vitorias + derrotas;
  const winRate = matches > 0 ? Math.round((vitorias / matches) * 100) : 0;

  const rankingQ = useQuery({
    queryKey: ["profile-ranking-position", profileId],
    queryFn: () => fetchProfileRankingPosition(profileId),
  });

  return (
    <Card className={compact ? "p-4 shadow-card" : "p-5 shadow-card"}>
      {!compact ? (
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="size-5 text-primary" />
          <h2 className="font-semibold text-base">Estatísticas</h2>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <StatBlock label="Pontos" value={pontos} />
        <StatBlock label="Vitórias" value={vitorias} accentClass="text-green-600" />
        <StatBlock label="Derrotas" value={derrotas} accentClass="text-red-600" />
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        <StatBlock label="Jogos" value={matches} />
        <StatBlock label="Aproveit." value={`${winRate}%`} accentClass="text-primary" />
      </div>

      <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp className="size-4 text-primary shrink-0" />
          <span className="text-sm font-medium">Ranking</span>
        </div>
        {rankingQ.isLoading ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : rankingQ.data ? (
          <Badge className="gradient-beach text-white border-0 shrink-0">
            #{rankingQ.data}º lugar
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {!compact ? (
        <Link
          to="/ranking"
          className="block text-center text-xs text-primary hover:underline mt-3"
        >
          Ver ranking completo
        </Link>
      ) : null}
    </Card>
  );
}
