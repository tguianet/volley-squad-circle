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

  const matches = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = matches.filter((m: any) => m.date >= today && m.status !== "cancelled" && m.status !== "finished");
  const past = matches.filter((m: any) => m.date < today || m.status === "finished");

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="size-10 rounded-xl gradient-beach flex items-center justify-center shadow-glow">
            <CalendarDays className="size-5 text-white" />
          </div>
          <h1 className="text-3xl">Agenda</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-6">Suas partidas confirmadas.</p>

        {isLoading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>}

        <section className="mb-6">
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Próximas</h2>
          {upcoming.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma partida agendada.</Card>
          ) : (
            <div className="space-y-3">{upcoming.map((m: any) => <MatchRow key={m.id} m={m}/>)}</div>
          )}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-wide text-muted-foreground mb-2">Finalizadas</h2>
          {past.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma partida no histórico.</Card>
          ) : (
            <div className="space-y-3">{past.map((m: any) => <MatchRow key={m.id} m={m}/>)}</div>
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
