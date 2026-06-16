import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Crown, Medal, Mars, Venus, Users, CalendarDays, MapPin } from "lucide-react";
import { useState } from "react";
import { PlayerPreview, type PreviewProfile } from "@/components/player-preview";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listScheduledChallenges } from "@/lib/ranking.functions";
import { supabase } from "@/integrations/supabase/client";
import { AvatarThumb } from "@/components/avatar-thumb";

type GenderFilter = "M" | "F" | "X";

export const Route = createFileRoute("/_authenticated/ranking/")({
  head: () => ({ meta: [{ title: "Ranking — PlayBeach" }] }),
  component: RankingPage,
});

type RankRow = {
  id: string;
  display_name: string;
  apelido: string | null;
  username: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  level: string | null;
  altura: number | null;
  mao_dominante: string | null;
  posicao_principal: string | null;
  genero: string | null;
  pontos: number;
  vitorias: number;
  derrotas: number;
};

async function fetchRanking(): Promise<RankRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, display_name, apelido, username, avatar_url, city, state, level, altura, mao_dominante, posicao_principal, genero, pontos, vitorias, derrotas",
    )
    .order("pontos", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as RankRow[];
}

function toPreview(p: RankRow): PreviewProfile {
  return {
    id: p.id,
    name: p.display_name,
    username: p.apelido ?? p.username,
    avatar: p.avatar_url,
    city: [p.city, p.state].filter(Boolean).join(", ") || null,
    level: p.level,
    height: p.altura != null ? Number(p.altura) : null,
    dominantHand: p.mao_dominante,
    position: p.posicao_principal,
    wins: p.vitorias,
    losses: p.derrotas,
    rankingPoints: p.pontos,
  };
}

function RankingPage() {
  const [tab, setTab] = useState<"ind" | "dupla" | "quarteto">("ind");
  const [gender, setGender] = useState<GenderFilter>("M");
  const effectiveGender: GenderFilter = tab === "ind" && gender === "X" ? "M" : gender;

  const q = useQuery({ queryKey: ["ranking-players"], queryFn: fetchRanking });
  const allPlayers = q.data ?? [];
  const players =
    tab === "ind" ? allPlayers.filter((p) => p.genero === effectiveGender) : allPlayers;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-3xl">Ranking</h1>
        <p className="text-sm text-muted-foreground mb-4">Os melhores na areia.</p>

        <ToggleGroup
          type="single"
          value={effectiveGender}
          onValueChange={(v) => {
            if (v === "M" || v === "F" || v === "X") setGender(v);
          }}
          className="mb-4 justify-start"
        >
          <ToggleGroupItem
            value="M"
            className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Mars className="size-4" /> Masculino
          </ToggleGroupItem>
          <ToggleGroupItem
            value="F"
            className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            <Venus className="size-4" /> Feminino
          </ToggleGroupItem>
          {tab !== "ind" && (
            <ToggleGroupItem
              value="X"
              className="gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              <Users className="size-4" /> Misto
            </ToggleGroupItem>
          )}
        </ToggleGroup>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "ind" | "dupla" | "quarteto")}>
          <TabsList className="bg-secondary">
            <TabsTrigger value="ind">Individual</TabsTrigger>
            <TabsTrigger value="dupla">Duplas</TabsTrigger>
            <TabsTrigger value="quarteto">Quartetos</TabsTrigger>
          </TabsList>

          <TabsContent value="ind" className="mt-4 space-y-3">
            {q.isLoading && (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
            )}
            {!q.isLoading && players.length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Ainda não há jogadores cadastrados no ranking.
              </Card>
            )}
            {players.map((p, i) => {
              const preview = toPreview(p);
              const total = p.vitorias + p.derrotas;
              const winRate = total ? ((p.vitorias / total) * 100).toFixed(0) : "0";
              return (
                <Card
                  key={p.id}
                  className="p-4 flex items-center gap-4 shadow-card hover:shadow-glow transition-shadow"
                >
                  <div
                    className={`size-10 rounded-full flex items-center justify-center font-display text-lg shrink-0 ${
                      i === 0
                        ? "gradient-beach text-white shadow-glow"
                        : i === 1
                          ? "bg-secondary text-foreground"
                          : i === 2
                            ? "bg-accent/30 text-accent-foreground"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i === 0 ? <Crown className="size-5" /> : i + 1}
                  </div>
                  <PlayerPreview player={preview}>
                    <Avatar className="size-12 ring-2 ring-primary/30 cursor-pointer">
                      <AvatarImage src={p.avatar_url ?? undefined} />
                      <AvatarFallback>{p.display_name[0]}</AvatarFallback>
                    </Avatar>
                  </PlayerPreview>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{p.display_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {preview.city ?? "—"}
                      {p.level ? ` • ${p.level}` : ""}
                    </div>
                  </div>
                  <div className="hidden sm:grid grid-cols-3 gap-3 text-center text-xs">
                    <div>
                      <div className="font-display text-base text-success">{p.vitorias}</div>
                      <div className="text-muted-foreground">V</div>
                    </div>
                    <div>
                      <div className="font-display text-base text-destructive">{p.derrotas}</div>
                      <div className="text-muted-foreground">D</div>
                    </div>
                    <div>
                      <div className="font-display text-base text-primary">{winRate}%</div>
                      <div className="text-muted-foreground">Apr.</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-2xl text-gradient">{p.pontos}</div>
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Medal className="size-3" />
                      pts
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="dupla" className="mt-4 space-y-3">
            <TeamRanking category="dupla" gender={effectiveGender} />
          </TabsContent>

          <TabsContent value="quarteto" className="mt-4 space-y-3">
            <TeamRanking category="quarteto" gender={effectiveGender} />
          </TabsContent>
        </Tabs>

        <ScheduledChallenges />
      </div>
    </AppLayout>
  );
}

function formatSunday(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function ScheduledChallenges() {
  const fetchScheduled = useServerFn(listScheduledChallenges);
  const q = useQuery({
    queryKey: ["scheduled-challenges"],
    queryFn: () => fetchScheduled(),
  });
  const items = q.data ?? [];
  if (q.isLoading) return null;
  return (
    <div className="mt-8">
      <h2 className="text-xl font-display flex items-center gap-2">
        <CalendarDays className="size-5" />
        Próximos desafios agendados
      </h2>
      <p className="text-xs text-muted-foreground mb-3">Sempre aos domingos.</p>
      {items.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum desafio agendado no momento.
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="font-semibold">
                {c.scheduled_date ? `Domingo ${formatSunday(c.scheduled_date)}` : "A agendar"}
                {c.scheduled_time ? ` — ${c.scheduled_time.slice(0, 5)}` : ""}
              </div>
              <div className="text-sm">
                {c.challenger?.name}{" "}
                {c.challenger?.rank_position ? `(#${c.challenger.rank_position})` : ""} vs{" "}
                {c.challenged?.name}{" "}
                {c.challenged?.rank_position ? `(#${c.challenged.rank_position})` : ""}
              </div>
              {c.arena && (
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="size-3" />
                  {c.arena.name}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

type TeamRankRow = {
  id: string;
  name: string;
  category: "dupla" | "quarteto";
  gender: "M" | "F" | "X";
  points: number;
  wins: number;
  losses: number;
  created_at: string;
  captain_id: string;
};

type TeamMemberLite = {
  id: string;
  display_name: string | null;
  apelido: string | null;
  avatar_url: string | null;
};

function TeamRanking({
  category,
  gender,
}: {
  category: "dupla" | "quarteto";
  gender: GenderFilter;
}) {
  const teamsQ = useQuery<TeamRankRow[]>({
    queryKey: ["ranking-teams", category, gender],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select(
          "id, name, category, gender, points, wins, losses, created_at, captain_id, rank_position",
        )
        .eq("is_active", true)
        .eq("category", category)
        .eq("gender", gender)
        .order("rank_position", { ascending: true, nullsFirst: false })
        .order("points", { ascending: false })
        .order("wins", { ascending: false })
        .order("losses", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TeamRankRow[];
    },
  });

  const teams = teamsQ.data ?? [];
  const teamIds = teams.map((t) => t.id);
  const captainIds = Array.from(new Set(teams.map((t) => t.captain_id)));

  const rosterQ = useQuery({
    queryKey: ["ranking-team-roster", teamIds.join(","), captainIds.join(",")],
    enabled: teamIds.length > 0,
    queryFn: async () => {
      const [membersRes, capsRes] = await Promise.all([
        supabase
          .from("team_members")
          .select("team_id, profile:profile_id(id, display_name, apelido, avatar_url)")
          .in("team_id", teamIds),
        supabase
          .from("profiles")
          .select("id, display_name, apelido, avatar_url")
          .in("id", captainIds),
      ]);
      if (membersRes.error) throw membersRes.error;
      if (capsRes.error) throw capsRes.error;
      const byTeam: Record<string, TeamMemberLite[]> = {};
      for (const row of (membersRes.data ?? []) as {
        team_id: string;
        profile: TeamMemberLite | null;
      }[]) {
        if (!row.profile) continue;
        (byTeam[row.team_id] ??= []).push(row.profile as TeamMemberLite);
      }
      const capById: Record<string, TeamMemberLite> = {};
      for (const p of (capsRes.data ?? []) as TeamMemberLite[]) capById[p.id] = p;
      return { byTeam, capById };
    },
  });

  if (teamsQ.isLoading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>;
  }
  if (teams.length === 0) {
    const label = gender === "F" ? "femininos" : gender === "X" ? "mistos" : "masculinos";
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        Nenhum time {category === "dupla" ? "de duplas" : "de quartetos"} {label} cadastrado ainda.
      </Card>
    );
  }

  const byTeam = rosterQ.data?.byTeam ?? {};
  const capById = rosterQ.data?.capById ?? {};

  return (
    <>
      {teams.map((t, i) => {
        const members = byTeam[t.id] ?? [];
        const cap = capById[t.captain_id];
        const roster: TeamMemberLite[] = [];
        const seen = new Set<string>();
        if (cap) {
          roster.push(cap);
          seen.add(cap.id);
        }
        for (const m of members)
          if (!seen.has(m.id)) {
            roster.push(m);
            seen.add(m.id);
          }
        const games = t.wins + t.losses;
        const categoryLabel =
          t.gender === "F" ? "Feminino" : t.gender === "X" ? "Misto" : "Masculino";
        return (
          <Card key={t.id} className="p-4 shadow-card hover:shadow-glow transition-shadow">
            <div className="flex items-center gap-4">
              <div
                className={`size-10 rounded-full flex items-center justify-center font-display text-lg shrink-0 ${
                  i === 0
                    ? "gradient-beach text-white shadow-glow"
                    : i === 1
                      ? "bg-secondary text-foreground"
                      : i === 2
                        ? "bg-accent/30 text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {i === 0 ? <Crown className="size-5" /> : i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="font-semibold truncate">{t.name}</div>
                  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {categoryLabel}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                  {roster.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-1.5 pl-0.5 pr-2 py-0.5 rounded-full bg-secondary/60"
                    >
                      <AvatarThumb
                        src={p.avatar_url}
                        name={p.display_name ?? ""}
                        className="size-5"
                      />
                      <span className="text-[11px] truncate max-w-[120px]">
                        {p.apelido ?? p.display_name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display text-2xl text-gradient">{t.points}</div>
                <div className="text-[10px] text-muted-foreground flex items-center gap-1 justify-end">
                  <Medal className="size-3" />
                  pts
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <div className="font-display text-base text-success">{t.wins}</div>
                <div className="text-muted-foreground">V</div>
              </div>
              <div>
                <div className="font-display text-base text-destructive">{t.losses}</div>
                <div className="text-muted-foreground">D</div>
              </div>
              <div>
                <div className="font-display text-base text-primary">{games}</div>
                <div className="text-muted-foreground">Jogos</div>
              </div>
            </div>
          </Card>
        );
      })}
    </>
  );
}
