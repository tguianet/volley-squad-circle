import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Swords, TrendingUp, BarChart3 } from "lucide-react";
import { listScheduledChallenges } from "@/lib/ranking.functions";
import type { RankingAnalytics } from "@/lib/ranking.types";

function formatSunday(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type RankingSidebarProps = {
  analytics: RankingAnalytics;
};

export function RankingSidebar({ analytics }: RankingSidebarProps) {
  const fetchScheduled = useServerFn(listScheduledChallenges);
  const challengesQ = useQuery({
    queryKey: ["scheduled-challenges"],
    queryFn: () => fetchScheduled(),
  });
  const challenges = (challengesQ.data ?? []).slice(0, 3);

  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      <Card className="p-0 overflow-hidden border-border/60 shadow-card ranking-glass">
        <div className="p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 size-24 bg-primary/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none" />
          <h3 className="font-display text-lg tracking-wide flex items-center gap-2 mb-4">
            <TrendingUp className="size-5 text-primary" />
            Maior evolução
          </h3>
          {analytics.movers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sem dados suficientes ainda.</p>
          ) : (
            <div className="space-y-2.5">
              {analytics.movers.map((entry) => (
                <div
                  key={`${entry.position}-${entry.name}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-display text-2xl text-primary leading-none shrink-0">
                      {String(entry.position).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-semibold truncate">{entry.name}</span>
                  </div>
                  <span className="font-display text-xl text-gradient leading-none shrink-0 ml-2">
                    {entry.points}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="p-4 sm:p-5 border-border/60 shadow-card">
        <h3 className="font-display text-lg tracking-wide flex items-center gap-2 mb-4">
          <BarChart3 className="size-5 text-accent" />
          Análise do ranking
        </h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="rounded-lg bg-secondary/40 px-2 py-2 text-center">
            <div className="font-display text-xl leading-none">{analytics.totalEntries}</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-0.5">Atletas</div>
          </div>
          <div className="rounded-lg bg-secondary/40 px-2 py-2 text-center">
            <div className="font-display text-xl leading-none">{analytics.totalGames}</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-0.5">Jogos</div>
          </div>
          <div className="rounded-lg bg-secondary/40 px-2 py-2 text-center">
            <div className="font-display text-xl leading-none">{analytics.averagePoints}</div>
            <div className="text-[10px] text-muted-foreground uppercase mt-0.5">Média pts</div>
          </div>
        </div>
        <div className="space-y-3">
          {analytics.distribution.map((entry) => (
            <div key={`${entry.position}-${entry.name}`} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold truncate uppercase tracking-wide text-muted-foreground">
                  {entry.name}
                </span>
                <span className="font-display text-base shrink-0">{entry.position}º</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full gradient-beach"
                  style={{ width: `${Math.max(entry.fillPercent, 4)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        {analytics.leader ? (
          <p className="text-[11px] text-muted-foreground mt-4 pt-3 border-t border-border/50">
            Líder: <strong className="text-foreground">{analytics.leader.name}</strong> com{" "}
            {analytics.leader.points} pts
          </p>
        ) : null}
      </Card>

      <Card className="p-4 sm:p-5 border-border/60 shadow-card">
        <h3 className="font-display text-lg tracking-wide flex items-center gap-2 mb-3">
          <CalendarDays className="size-5 text-primary" />
          Próximos desafios
        </h3>
        <p className="text-[11px] text-muted-foreground mb-3">Sempre aos domingos.</p>
        {challengesQ.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : challenges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum desafio agendado.</p>
        ) : (
          <ul className="space-y-2.5">
            {challenges.map((c) => (
              <li
                key={c.id}
                className="text-xs rounded-lg bg-secondary/40 border border-border/50 px-3 py-2.5"
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  <Swords className="size-3 text-primary shrink-0" />
                  {c.scheduled_date ? `Dom ${formatSunday(c.scheduled_date)}` : "A agendar"}
                  {c.scheduled_time ? ` · ${c.scheduled_time.slice(0, 5)}` : ""}
                </div>
                <p className="text-muted-foreground mt-1 truncate">
                  {c.challenger?.name} vs {c.challenged?.name}
                </p>
                {c.arena ? (
                  <p className="text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 shrink-0" />
                    {c.arena.name}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <Link to="/desafios" className="block mt-3">
          <Button variant="outline" size="sm" className="w-full h-8 text-xs">
            Ver desafios
          </Button>
        </Link>
      </Card>
    </div>
  );
}
