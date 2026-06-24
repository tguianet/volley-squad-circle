import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Swords, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { listScheduledChallenges } from "@/lib/ranking.functions";

type UpcomingMatch = {
  id: string;
  title: string;
  date: string;
  start_time: string;
  arena: { name: string } | null;
};

function formatSunday(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function formatMatchDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
}

function FeedSeasonCard() {
  return (
    <Card className="p-0 overflow-hidden border-border/60 shadow-card">
      <div className="gradient-ocean px-4 py-3 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider opacity-90">
            <TrendingUp className="size-3" />
            Temporada
          </div>
          <span className="font-display text-xl leading-none">Top 10%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div className="h-full w-3/4 rounded-full bg-accent" />
        </div>
      </div>
    </Card>
  );
}

function FeedCommunityCard() {
  return (
    <Card className="p-3.5 border-border/60 shadow-card">
      <h3 className="font-display text-base tracking-wide mb-2.5">Comunidade ao vivo</h3>
      <ul className="space-y-2 text-xs">
        <li className="flex items-start gap-2">
          <span className="size-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
          <span className="text-muted-foreground">Domingo: partidas abertas nas arenas</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
          <span className="text-muted-foreground">Ranking atualizado após cada desafio</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="size-1.5 rounded-full bg-success mt-1.5 shrink-0" />
          <span className="text-muted-foreground">Novos times entrando na competição</span>
        </li>
      </ul>
      <Link to="/ranking" className="block mt-3">
        <Button variant="outline" size="sm" className="w-full h-8 text-xs">
          Ver ranking
        </Button>
      </Link>
    </Card>
  );
}

function FeedUpcomingSection() {
  const fetchScheduled = useServerFn(listScheduledChallenges);
  const challengesQ = useQuery({
    queryKey: ["scheduled-challenges"],
    queryFn: () => fetchScheduled(),
  });

  const matchesQ = useQuery({
    queryKey: ["feed-upcoming-matches"],
    queryFn: async (): Promise<UpcomingMatch[]> => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, title, date, start_time, arena:arena_id(name)")
        .in("status", ["open", "full"])
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date")
        .order("start_time")
        .limit(3);
      if (error) throw error;
      return (data ?? []) as UpcomingMatch[];
    },
  });

  const challenges = (challengesQ.data ?? []).slice(0, 2);
  const matches = matchesQ.data ?? [];
  const hasChallenges = challenges.length > 0;
  const hasMatches = matches.length > 0;

  if (!hasChallenges && !hasMatches && !challengesQ.isLoading && !matchesQ.isLoading) {
    return null;
  }

  return (
    <Card className="p-3.5 border-border/60 shadow-card">
      <h3 className="font-display text-base tracking-wide mb-2.5 flex items-center gap-1.5">
        <CalendarDays className="size-4 text-primary" />
        Próximos eventos
      </h3>

      {challengesQ.isLoading || matchesQ.isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando…</p>
      ) : (
        <ul className="space-y-2.5">
          {challenges.map((c) => (
            <li key={c.id} className="text-xs rounded-lg bg-secondary/40 px-2.5 py-2">
              <div className="flex items-center gap-1 font-semibold text-foreground">
                <Swords className="size-3 text-primary shrink-0" />
                Desafio
                {c.scheduled_date ? ` · Dom ${formatSunday(c.scheduled_date)}` : ""}
              </div>
              <p className="text-muted-foreground mt-0.5 truncate">
                {c.challenger?.name} vs {c.challenged?.name}
              </p>
            </li>
          ))}
          {matches.map((m) => (
            <li key={m.id} className="text-xs rounded-lg bg-secondary/40 px-2.5 py-2">
              <div className="font-semibold text-foreground truncate">{m.title}</div>
              <p className="text-muted-foreground mt-0.5">
                {formatMatchDate(m.date)} · {m.start_time.slice(0, 5)}
                {m.arena?.name ? ` · ${m.arena.name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2 mt-3">
        {hasMatches ? (
          <Link to="/partidas" className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">
              Partidas
            </Button>
          </Link>
        ) : null}
        {hasChallenges ? (
          <Link to="/desafios" className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">
              Desafios
            </Button>
          </Link>
        ) : null}
      </div>
    </Card>
  );
}

export function FeedSidebarRight() {
  return (
    <div className="space-y-3 lg:sticky lg:top-6">
      <FeedSeasonCard />
      <FeedCommunityCard />
      <FeedUpcomingSection />
    </div>
  );
}
