import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, MapPin, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-auth";

export const Route = createFileRoute("/agenda/")({
  head: () => ({ meta: [{ title: "Agenda — PlayBeach" }] }),
  component: AgendaPage,
});

function AgendaPage() {
  const { user } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["my-matches", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_players")
        .select("status, match:match_id(id, title, date, start_time, end_time, modality, match_type, status, arena:arena_id(name, city))")
        .eq("player_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.match).filter(Boolean);
    },
  });

  const { data: challenges, isLoading: loadingCh } = useQuery({
    queryKey: ["my-challenges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: cap }, { data: mem }] = await Promise.all([
        supabase.from("teams").select("id").eq("captain_id", user!.id),
        supabase.from("team_members").select("team_id").eq("profile_id", user!.id),
      ]);
      const teamIds = Array.from(new Set([
        ...((cap ?? []) as any[]).map((t) => t.id),
        ...((mem ?? []) as any[]).map((t) => t.team_id),
      ]));
      if (teamIds.length === 0) return [];
      const list = teamIds.join(",");
      const { data, error } = await supabase
        .from("challenges")
        .select("id, scheduled_date, scheduled_time, duration_minutes, status, challenger_team_id, challenged_team_id, court:court_id(name, number), challenger:challenger_team_id(name), challenged:challenged_team_id(name)")
        .in("status", ["pending", "awaiting_schedule", "reschedule_requested", "scheduled", "completed"])
        .or(`challenger_team_id.in.(${list}),challenged_team_id.in.(${list})`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: availability, isLoading: loadingAv } = useQuery({
    queryKey: ["my-availability-agenda", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [{ data: cap }, { data: mem }] = await Promise.all([
        supabase.from("teams").select("id").eq("captain_id", user!.id),
        supabase.from("team_members").select("team_id").eq("profile_id", user!.id),
      ]);
      const teamIds = Array.from(new Set([
        ...((cap ?? []) as any[]).map((t) => t.id),
        ...((mem ?? []) as any[]).map((t) => t.team_id),
      ]));
      if (teamIds.length === 0) return [];
      const { data, error } = await supabase
        .from("team_monthly_availability")
        .select("id, sunday_date, time_start, time_end, is_available, team:team_id(name), court:court_id(name, number)")
        .in("team_id", teamIds)
        .eq("is_available", true)
        .order("sunday_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const matches = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcomingM = matches.filter((m: any) => m.date >= today && m.status !== "cancelled" && m.status !== "finished");
  const pastM = matches.filter((m: any) => m.date < today || m.status === "finished");

  const chs = challenges ?? [];
  const upcomingC = chs.filter((c: any) => c.status !== "completed" && c.status !== "declined" && c.status !== "wo" && (!c.scheduled_date || c.scheduled_date >= today));
  const pastC = chs.filter((c: any) => c.status === "completed" || (c.scheduled_date && c.scheduled_date < today));
  const avs = availability ?? [];
  const upcomingA = avs.filter((a: any) => a.sunday_date >= today);
  const pastA = avs.filter((a: any) => a.sunday_date < today);

  const upcomingEmpty = upcomingM.length === 0 && upcomingC.length === 0 && upcomingA.length === 0;
  const pastEmpty = pastM.length === 0 && pastC.length === 0 && pastA.length === 0;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl gradient-beach flex items-center justify-center shadow-glow">
            <CalendarDays className="size-5 text-white" />
          </div>
          <h1 className="text-3xl">Agenda</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Suas partidas, desafios e horários confirmados.</p>

        {(isLoading || loadingCh || loadingAv) && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>}

        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Próximas</h2>
          {upcomingEmpty ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma partida agendada.</Card>
          ) : (
            <div className="space-y-3">
              {upcomingA.map((a: any) => <AvailabilityAgendaRow key={a.id} a={a} />)}
              {upcomingC.map((c: any) => <ChallengeRow key={c.id} c={c} />)}
              {upcomingM.map((m: any) => <MatchRow key={m.id} m={m} />)}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Finalizadas</h2>
          {pastEmpty ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma partida no histórico.</Card>
          ) : (
            <div className="space-y-3">
              {pastA.map((a: any) => <AvailabilityAgendaRow key={a.id} a={a} />)}
              {pastC.map((c: any) => <ChallengeRow key={c.id} c={c} />)}
              {pastM.map((m: any) => <MatchRow key={m.id} m={m} />)}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}

function MatchRow({ m }: { m: any }) {
  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg">{m.title}</div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
            <span className="flex items-center gap-1"><MapPin className="size-3"/>{m.arena?.name ?? "Sem arena"}</span>
            <span className="flex items-center gap-1"><CalendarDays className="size-3"/>{m.date}</span>
            <span className="flex items-center gap-1"><Clock className="size-3"/>{m.start_time?.slice(0,5)}</span>
          </div>
        </div>
        <Badge variant="outline">{m.match_type}</Badge>
      </div>
    </Card>
  );
}

function ChallengeRow({ c }: { c: any }) {
  const courtLabel = c.court?.name
    ? ` — ${c.court.name}`
    : c.court?.number
    ? ` — Quadra ${c.court.number}`
    : "";
  return (
    <Card className="p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-lg">
            {c.challenger?.name ?? "Equipe"} <span className="text-muted-foreground">vs</span> {c.challenged?.name ?? "Equipe"}
          </div>
          <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-1">
            <span className="flex items-center gap-1"><MapPin className="size-3"/>PlayBeach Arena{courtLabel}</span>
            {c.scheduled_date && <span className="flex items-center gap-1"><CalendarDays className="size-3"/>{c.scheduled_date}</span>}
            {c.scheduled_time && <span className="flex items-center gap-1"><Clock className="size-3"/>{String(c.scheduled_time).slice(0,5)}</span>}
          </div>
        </div>
        <Badge variant={c.status === "completed" ? "secondary" : c.status === "scheduled" ? "default" : "outline"}>
          {c.status === "completed" ? "Finalizado" : c.status === "scheduled" ? "Agendado" : c.status === "pending" ? "Pendente" : c.status === "awaiting_schedule" ? "A agendar" : c.status === "reschedule_requested" ? "Reagendar" : "Desafio"}
        </Badge>
      </div>
    </Card>
  );
}
